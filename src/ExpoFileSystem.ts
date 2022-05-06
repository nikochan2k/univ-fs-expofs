import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from "expo-file-system";
import {
  AbstractDirectory,
  AbstractFile,
  AbstractFileSystem,
  createError,
  FileSystemOptions,
  normalizePath,
  NotReadableError,
  NotSupportedError,
  PatchOptions,
  Stats,
  URLOptions,
} from "univ-fs";
import { ExpoDirectory } from "./ExpoDirectory";
import { ExpoFile } from "./ExpoFile";

export interface ExpoFileSystemOptions extends FileSystemOptions {
  useEtag?: boolean;
}

export class ExpoFileSystem extends AbstractFileSystem {
  private readonly rootUri: string;

  constructor(rootDir: string, private expoFSOptions?: ExpoFileSystemOptions) {
    super(normalizePath(rootDir), expoFSOptions);
    const rootUri = (documentDirectory ?? "").replace(/\/+$/, "") + rootDir;
    (async () => {
      const info = await getInfoAsync(rootUri);
      if (!info.exists) {
        await makeDirectoryAsync(rootUri);
      }
    })().catch((e) => {
      console.warn(e);
    });
    this.rootUri = rootUri;
  }

  public _doGetDirectory(path: string): Promise<AbstractDirectory> {
    return Promise.resolve(new ExpoDirectory(this, path));
  }

  public _doGetFile(path: string): Promise<AbstractFile> {
    return Promise.resolve(new ExpoFile(this, path));
  }

  public async _doHead(path: string): Promise<Stats> {
    try {
      const uri = this._resolveURL(path);
      const info = await getInfoAsync(uri, {
        size: true,
        md5: this.expoFSOptions?.useEtag,
      });
      return {
        modified: info.modificationTime,
        size: info.size,
        etag: info.md5,
      };
    } catch (e) {
      throw createError({
        name: NotReadableError.name,
        repository: this.repository,
        path,
        e,
      });
    }
  }

  public _doPatch(
    path: string,
    _stats: Stats, // eslint-disable-line @typescript-eslint/no-unused-vars
    _props: Stats, // eslint-disable-line @typescript-eslint/no-unused-vars
    _options: PatchOptions // eslint-disable-line
  ): Promise<void> {
    throw createError({
      name: NotSupportedError.name,
      repository: this.repository,
      path,
      e: { message: "patch is not supported" },
    });
  }

  public _resolveURL(path: string) {
    return `${this.rootUri}${path}`;
  }

  public _doToURL(
    path: string,
    _isDirectory: boolean, // eslint-disable-line
    _options?: URLOptions // eslint-disable-line
  ): Promise<string> {
    return Promise.resolve(this._resolveURL(path));
  }

  public canPatchAccessed(): boolean {
    return false;
  }

  public canPatchCreated(): boolean {
    return false;
  }

  public canPatchModified(): boolean {
    return false;
  }

  public supportDirectory(): boolean {
    return true;
  }
}
