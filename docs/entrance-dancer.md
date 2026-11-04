# Landing entrance dancer

The silhouette is a custom render of CMU Graphics Lab's recorded breakdance take
`85_03` (Upright Sequence). The motion data came from [the CMU motion capture
database](https://mocap.cs.cmu.edu/), which was created with funding from NSF
EIA-0196217. The [BVH converter's usage terms](https://sites.google.com/a/cgspeed.com/cgspeed/motion-capture/the-motionbuilder-friendly-bvh-conversion-release-of-cmus-motion-capture-database/readme-file-for-the-bvh-conversion-release)
permit use in research and commercial projects.

To regenerate the assets, extract `85_03.bvh` from [the archived conversion](https://github.com/Shriinivas/cmubvh/blob/main/Sequence-081-085/85/Data/85_03.zip).
Run these commands from the repository root with NumPy, Pillow and FFmpeg installed.

```powershell
python tools/render-entrance-dancer.py 85_03.bvh .workspace/dancer-frames --start 16.96667 --seconds 2.733333 --yaw 20
ffmpeg -framerate 60 -i '.workspace/dancer-frames/%04d.png' -frames:v 164 -vf format=yuv420p -an -c:v libx264 -crf 23 -preset slow -movflags +faststart apps/web/public/images/entrance-dancer.mp4
ffmpeg -i .workspace/dancer-frames/0000.png -frames:v 1 -c:v libwebp -lossless 1 apps/web/public/images/entrance-dancer.webp
```

The site serves only the 320×320 silent video and its still. The renderer, Python
packages and original motion data are offline inputs. The clip is separate from
the page readiness checks and the loader still provides an immediate skip.
