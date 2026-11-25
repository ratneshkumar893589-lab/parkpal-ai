import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ParkPal AI", short_name: "ParkPal", description: "Smart parking discovery and prediction",
    start_url: "/", display: "standalone", background_color: "#f5f8fc", theme_color: "#10284d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
