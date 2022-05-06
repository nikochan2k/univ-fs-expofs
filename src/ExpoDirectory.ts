import {
  deleteAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
} from "expo-file-system";
import {
  AbstractDirectory,
  createError,
  Item,
  joinPaths,
  NoModificationAllowedError,
  NotReadableError,
} from "univ-fs";
import { ExpoFileSystem } from "./ExpoFileSystem";

export class ExpoDirectory extends AbstractDirectory {
  private readonly uri: string;

  constructor(efs: ExpoFileSystem, path: string) {
    super(efs, path);
    this.uri = efs._resolveURL(path);
  }

  public async _doList(): Promise<Item[]> {
    try {
      const names = await readDirectoryAsync(this.uri);
      return names.map((name) => {
        return { path: joinPaths(this.path, name) };
      });
    } catch (e) {
      throw createError({
        name: NotReadableError.name,
        repository: this.fs.repository,
        path: this.path,
        e,
      });
    }
  }

  public async _doMkcol(): Promise<void> {
    try {
      await makeDirectoryAsync(this.uri);
    } catch (e) {
      throw createError({
        name: NoModificationAllowedError.name,
        repository: this.fs.repository,
        path: this.path,
        e,
      });
    }
  }

  public async _doRmdir(): Promise<void> {
    try {
      await deleteAsync(this.uri);
    } catch (e) {
      throw createError({
        name: NoModificationAllowedError.name,
        repository: this.fs.repository,
        path: this.path,
        e,
      });
    }
  }
}
