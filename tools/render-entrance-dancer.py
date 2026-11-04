"""Render the loader silhouette offline from a CMU BVH recording (NumPy and Pillow)."""

import argparse
import math
from pathlib import Path
import re

import numpy as np
from PIL import Image, ImageDraw


def read_bvh(path):
    hierarchy, motion = path.read_text().split("MOTION", 1)
    joints = {}
    stack = []
    pending = None
    channel_count = 0
    for row in hierarchy.splitlines():
        parts = row.split()
        if not parts:
            continue
        label, *values = parts
        if label in {"ROOT", "JOINT"}:
            pending = values[0]
        elif label == "End":
            pending = stack[-1] + "End"
        elif label == "{":
            joints[pending] = {"parent": stack[-1] if stack else None, "channels": []}
            stack.append(pending)
        elif label == "}":
            stack.pop()
        elif label == "OFFSET":
            joints[stack[-1]]["offset"] = np.array(values, dtype=float)
        elif label == "CHANNELS":
            channels = values[1:]
            joints[stack[-1]]["channels"] = list(enumerate(channels, channel_count))
            channel_count += len(channels)
    _, interval, samples = re.split(r"Frame Time:\s*([\d.]+)\s*\n", motion, maxsplit=1)
    return joints, np.fromstring(samples, sep=" ").reshape(-1, channel_count), float(interval)


def forward_kinematics(joints, samples):
    """Apply the channel order recorded in the BVH hierarchy."""
    positions, rotations = {}, {}
    for name, joint in joints.items():
        offset = np.broadcast_to(joint["offset"], (len(samples), 3)).copy()
        rotation = np.broadcast_to(np.eye(3), (len(samples), 3, 3)).copy()
        for column, channel in joint["channels"]:
            axis = "XYZ".index(channel[0])
            if channel.endswith("position"):
                offset[:, axis] += samples[:, column]
                continue
            radians = np.deg2rad(samples[:, column])
            first, second = (axis + 1) % 3, (axis + 2) % 3
            matrix = np.broadcast_to(np.eye(3), rotation.shape).copy()
            matrix[:, first, first] = matrix[:, second, second] = np.cos(radians)
            matrix[:, second, first] = np.sin(radians)
            matrix[:, first, second] = -matrix[:, second, first]
            rotation = rotation @ matrix
        parent = joint["parent"]
        if parent:
            positions[name] = positions[parent] + (rotations[parent] @ offset[..., None])[..., 0]
            rotations[name] = rotations[parent] @ rotation
        else:
            positions[name], rotations[name] = offset, rotation
    return positions, rotations


def render(pose, head_rotation, yaw, center, scale, size):
    image = Image.new("L", (size * 2, size * 2))
    draw = ImageDraw.Draw(image)
    view = np.array([math.cos(yaw), 0, math.sin(yaw)])
    unit = scale * 2

    def project(point):
        return size + (point @ view - center) * unit, size * 1.82 - point[1] * unit

    def ellipse(center_xy, x_radius, y_radius):
        x, y = center_xy
        draw.ellipse((x - x_radius, y - y_radius, x + x_radius, y + y_radius), fill=255)

    def limb(start, end, start_width, end_width):
        """Rounded tapered volumes drawn as the convex hull of two discs."""
        a, b = np.array(project(start)), np.array(project(end))
        direction = b - a
        length = np.linalg.norm(direction)
        if length > .001:
            perpendicular = direction[::-1] * [-1, 1] / length
            draw.polygon([tuple(a + perpendicular * start_width * unit),
                          tuple(b + perpendicular * end_width * unit),
                          tuple(b - perpendicular * end_width * unit),
                          tuple(a - perpendicular * start_width * unit)], fill=255)
        ellipse(a, start_width * unit, start_width * unit)
        ellipse(b, end_width * unit, end_width * unit)

    left, right = pose["LeftArm"], pose["RightArm"]
    chest = (left + right) / 2
    pelvis = pose["Hips"]
    hips = (pose["LeftUpLeg"] + pose["RightUpLeg"]) / 2
    waist = pelvis * .55 + chest * .45
    draw.polygon([project(p) for p in (left, right, pose["RightUpLeg"], pose["LeftUpLeg"])], fill=255)
    limb(left, right, 1.10, 1.10)
    limb(chest, waist, 1.95, 1.85)
    limb(waist, hips, 1.85, 1.96)
    limb(pose["LeftUpLeg"], pose["RightUpLeg"], 1.53, 1.53)
    limb(chest, pose["Head"], 1.01, .84)
    head = pose["Head"] + head_rotation @ np.array([0, .81, .12])
    ellipse(project(head), 1.45 * unit, 1.82 * unit)
    # A short cap bill defines the profile as the dancer turns.
    bill = head + head_rotation @ np.array([0, .63, 1.84])
    limb(head + head_rotation @ np.array([0, .63, .68]), bill, .52, .16)

    for side in ("Left", "Right"):
        shoulder, elbow, wrist, fingers = (pose[side + joint] for joint in
                                           ("Arm", "ForeArm", "Hand", "HandIndex1End"))
        hip, knee, ankle, toe = (pose[side + joint] for joint in
                                 ("UpLeg", "Leg", "Foot", "ToeBaseEnd"))
        limb(shoulder, elbow, 1.13, .73)
        limb(elbow, wrist, .76, .47)
        limb(wrist, fingers, .56, .37)
        limb(hip, knee, 1.56, 1.11)
        limb(knee, ankle, 1.14, .69)
        heel = ankle + (ankle - toe) * .20
        limb(heel, toe, .81, .58)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bvh", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--start", type=float, default=0)
    parser.add_argument("--seconds", type=float, default=2.4)
    parser.add_argument("--yaw", type=float, default=0)
    parser.add_argument("--sheet", action="store_true", help="Preview one pose every half second.")
    args = parser.parse_args()
    joints, samples, interval = read_bvh(args.bvh)
    fps = 2 if args.sheet else 60
    count = min(round(args.seconds * fps), int((len(samples) * interval - args.start) * fps))
    overlap = 0 if args.sheet else round(.24 * fps)
    indices = np.rint((args.start + np.arange(count + overlap) / fps) / interval).astype(int)
    if len(indices) == 0 or indices[-1] >= len(samples):
        parser.error("Choose a range with at least 0.24 seconds of source left for the loop seam.")
    positions, rotations = forward_kinematics(joints, samples[indices])
    if overlap:
        # Blend the matching continuation into the first beat so looping never
        # jumps back to a different pose. The rest is straight from the recording.
        weight = np.linspace(0, 1, overlap)
        weight = weight**2 * (3 - 2 * weight)
        for tracks in (positions, rotations):
            for track in tracks.values():
                blend = weight.reshape((overlap,) + (1,) * (track.ndim - 1))
                track[:overlap] = track[count:] * (1 - blend) + track[:overlap] * blend
    yaw = math.radians(args.yaw)
    horizontal = positions["Hips"] @ [math.cos(yaw), 0, math.sin(yaw)]
    center = (horizontal.min() + horizontal.max()) / 2
    if args.sheet:
        sheet = Image.new("L", (720, math.ceil(count / 8) * 110))
        draw = ImageDraw.Draw(sheet)
    else:
        args.output.mkdir(parents=True, exist_ok=True)
    for index in range(count):
        pose = {name: values[index] for name, values in positions.items()}
        if args.sheet:
            x, y = index % 8 * 90, index // 8 * 110
            frame = render(pose, rotations["Head"][index], yaw, horizontal[index], 2.4, 90)
            sheet.paste(frame, (x, y))
            draw.text((x + 4, y + 93), f"{args.start + index / fps:.1f}s", fill=255)
        else:
            frame = render(pose, rotations["Head"][index], yaw, center, 8.65, 320)
            frame.save(args.output / f"{index:04}.png")
    if args.sheet:
        sheet.save(args.output)


if __name__ == "__main__":
    main()
