import path from "node:path";

export const projectRoot = process.cwd();
export const sourceJsonPath = path.join(projectRoot, "ptcg_chs_infos.json");
export const dataDirPath = path.join(projectRoot, "data");
export const sqlitePath = path.join(dataDirPath, "ptcg.sqlite");
