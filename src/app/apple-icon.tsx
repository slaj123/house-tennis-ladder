import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const CHALK = "#f4f1ea";
const line = (style: React.CSSProperties) => (
  <div style={{ position: "absolute", background: CHALK, opacity: 0.85, display: "flex", ...style }} />
);

/** Home-screen icon: a court seen from above, with a ball in the service box. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0f4d2c" }}>
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 26,
            width: 100,
            height: 128,
            border: `5px solid ${CHALK}`,
            opacity: 0.85,
            display: "flex",
          }}
        />
        {line({ left: 40, top: 88, width: 100, height: 5 })}
        {line({ left: 54, top: 54, width: 72, height: 5 })}
        {line({ left: 54, top: 122, width: 72, height: 5 })}
        {line({ left: 88, top: 54, width: 5, height: 73 })}
        <div
          style={{
            position: "absolute",
            left: 102,
            top: 56,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#d7e04a",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
