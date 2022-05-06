import {
  deleteAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system";
import { Data, EMPTY_UINT8_ARRAY } from "univ-conv";
import {
  AbstractFile,
  createError,
  DEFAULT_BUFFER_SIZE,
  joinPaths,
  NoModificationAllowedError,
  NotReadableError,
  ReadOptions,
  Stats,
  WriteOptions,
} from "univ-fs";
import { ExpoFileSystem } from "./ExpoFileSystem";

export class ExpoFile extends AbstractFile {
  private readonly uri: string;

  constructor(efs: ExpoFileSystem, path: string) {
    super(efs, path);
    this.uri = efs._resolveURL(path);
  }

  public async _doRead(stats: Stats, options: ReadOptions): Promise<Data> {
    const start = options.start ?? 0;
    const size = stats.size as number;
    let end = options.length ?? size;
    if (size < end) {
      end = size;
    }
    if (end <= start) {
      return EMPTY_UINT8_ARRAY;
    }

    const byteLength = end - start;
    const u8 = new Uint8Array(byteLength);
    const bufferSize = options.bufferSize ?? DEFAULT_BUFFER_SIZE;

    const converter = this._getConverter();
    for (let position = start; position < end; position += length) {
      try {
        const base64 = await readAsStringAsync(this.uri, {
          encoding: "base64",
          position,
          length: bufferSize,
        });
        const chunk = await converter.toUint8Array(base64, {
          srcStringType: "base64",
          bufferSize: options.bufferSize,
        });
        u8.set(chunk, start);
      } catch (e) {
        throw createError({
          name: NotReadableError.name,
          repository: this.fs.repository,
          path: this.path,
          e,
        });
      }
    }
    return u8;
  }

  public async _doRm(): Promise<void> {
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

  public async _doWrite(
    data: Data,
    _stats: Stats | undefined, // eslint-disable-line
    options: WriteOptions
  ): Promise<void> {
    const converter = this._getConverter();
    const base64 = await converter.toBase64(data, {
      srcStringType: options.srcStringType,
      bufferSize: options.bufferSize,
    });
    try {
      await writeAsStringAsync(this.uri, base64, {
        encoding: "base64",
      });
    } catch (e) {
      throw createError({
        name: NoModificationAllowedError.name,
        repository: this.fs.repository,
        path: this.path,
        e,
      });
    }
  }

  public _getFullPath() {
    return joinPaths(this.fs.repository, this.path);
  }

  public supportAppend(): boolean {
    return true;
  }

  public supportRangeRead(): boolean {
    return true;
  }

  public supportRangeWrite(): boolean {
    return true;
  }
}
