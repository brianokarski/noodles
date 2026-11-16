import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Project } from "../types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    invoke<Project[]>("get_projects").then(setProjects);

    const unlisten = listen<Project[]>("projects-updated", (event) => {
      setProjects(event.payload);
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return projects;
}
