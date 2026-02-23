import axios from "axios";

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
}

export const fetchRelease = async (): Promise<Release> => {
  const version = await window.electronAPI.getVersion();
  const { data } = await axios.get(
    `https://api.github.com/repos/nanosabo/XO-Craft-Solution/releases/tags/v${version}`,
  );
  return data;
};

export const showVersion = async () => {
  const current = await window.electronAPI.getVersion();
  const saved = localStorage.getItem("version");
  return current !== saved;
};

export const saveCurrentVersion = async () => {
  const current = await window.electronAPI.getVersion();
  localStorage.setItem("version", current);
};
