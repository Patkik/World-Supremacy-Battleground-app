import { ImageResponse } from "next/og";

export const alt = "World Supremacy Battlegrounds — Find your street dance event";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#070709", color: "#F4F5F8", padding: 64 }}>
      <div style={{ display: "flex", fontSize: 26 }}>WORLD SUPREMACY BATTLEGROUNDS</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
        <span>FIND YOUR</span><span>STREET DANCE EVENT.</span>
      </div>
      <div style={{ display: "flex", color: "#D4FF00", fontSize: 28 }}>Your crew. Your next stage.</div>
    </div>,
    size,
  );
}
