"use client";

import { createContext, useContext } from "react";

const ProjectContext = createContext<string | null>(null);

export function ProjectProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  return <ProjectContext value={projectId}>{children}</ProjectContext>;
}

export function useProjectId() {
  const id = useContext(ProjectContext);
  if (!id) throw new Error("ProjectProvider required");
  return id;
}
