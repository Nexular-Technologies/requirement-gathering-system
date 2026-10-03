import * as React from "react";
import { ProjectList } from "./ProjectList";
import { ProjectView } from "./ProjectView";
import { TopicView } from "./TopicView";

type View =
  | { name: "projects" }
  | { name: "project"; projectId: string }
  | { name: "topic"; projectId: string; topicId: string };

/** Project → topic → question thread, navigated in place. */
export function AcquisitionPanel() {
  const [view, setView] = React.useState<View>({ name: "projects" });

  switch (view.name) {
    case "project":
      return (
        <ProjectView
          projectId={view.projectId}
          onBack={() => setView({ name: "projects" })}
          onOpenTopic={(topicId) => setView({ name: "topic", projectId: view.projectId, topicId })}
        />
      );
    case "topic":
      return (
        <TopicView
          topicId={view.topicId}
          onBack={() => setView({ name: "project", projectId: view.projectId })}
        />
      );
    default:
      return <ProjectList onOpen={(projectId) => setView({ name: "project", projectId })} />;
  }
}
