import type { MetadataRoute } from "next";

/** iOS reads `display` from here to open the home-screen app full-screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tennis Ladder",
    short_name: "Ladder",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#0f4d2c",
  };
}
