/** Maps a project/topic/question status onto the dashboard's badge palette. */
export const statusVariant = (status: string): "good" | "warn" | "outline" | "default" => {
  switch (status) {
    case "active":
    case "answered":
    case "resolved":
      return "good";
    case "refining":
    case "on-hold":
      return "warn";
    case "closed":
    case "parked":
      return "outline";
    default:
      return "default";
  }
};
