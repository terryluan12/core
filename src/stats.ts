import type * as Node from 'fs';
import type { Cred } from './cred.js';
import { S_IFBLK, S_IFCHR, S_IFDIR, S_IFIFO, S_IFLNK, S_IFMT, S_IFREG, S_IFSOCK, S_IRWXG, S_IRWXO, S_IRWXU } from './emulation/constants.js';
import { size_max } from './inode.js';

/**
 * Indicates the type of the given file. Applied to 'mode'.
 */
export type FileType = typeof S_IFREG | typeof S_IFDIR | typeof S_IFLNK;

/**
 *
 */
export interface StatsLike<T extends number | bigint = number | bigint> {
	/**
	 * Size of the item in bytes.
	 * For directories/symlinks, this is normally the size of the struct that represents the item.
	 */
	size: T;
	/**
	 * Unix-style file mode (e.g. 0o644) that includes the item type
	 * Type of the item can be FILE, DIRECTORY, SYMLINK, or SOCKET
	 */
	mode: T;
	/**
	 * time of last access, in milliseconds since epoch
	 */
	atimeMs: T;
	/**
	 * time of last modification, in milliseconds since epoch
	 */
	mtimeMs: T;
	/**
	 * time of last time file status was changed, in milliseconds since epoch
	 */
	ctimeMs: T;
	/**
	 * time of file creation, in milliseconds since epoch
	 */
	birthtimeMs: T;
	/**
	 * the id of the user that owns the file
	 */
	uid: T;
	/**
	 * the id of the group that owns the file
	 */
	gid: T;
	/**
	 * the ino
	 */
	ino: T;
}

/**
 * Provides information about a particular entry in the file system.
 * Common code used by both Stats and BigIntStats.
 */
export abstract class StatsCommon<T extends number | bigint> implements Node.StatsBase<T>, StatsLike {
	protected abstract _isBigint: T extends bigint ? true : false;

	protected _convert(arg: number | bigint | string | boolean): T {
		return (this._isBigint ? BigInt(arg) : Number(arg)) as T;
	}

	public get blocks(): T {
		return this._convert(Math.ceil(Number(this.size) / 512));
	}

	/**
	 * Unix-style file mode (e.g. 0o644) that includes the type of the item.
	 * Type of the item can be FILE, DIRECTORY, SYMLINK, or SOCKET
	 */
	public mode: T;

	/**
	 * ID of device containing file
	 */
	public dev: T = this._convert(0);

	/**
	 * inode number
	 */
	public ino: T = this._convert(0);

	/**
	 * device ID (if special file)
	 */
	public rdev: T = this._convert(0);

	/**
	 * number of hard links
	 */
	public nlink: T = this._convert(1);

	/**
	 * blocksize for file system I/O
	 */
	public blksize: T = this._convert(4096);

	/**
	 * user ID of owner
	 */
	public uid: T = this._convert(0);

	/**
	 * group ID of owner
	 */
	public gid: T = this._convert(0);

	/**
	 * Some file systems stash data on stats objects.
	 */
	public fileData?: Uint8Array;

	/**
	 * time of last access, in milliseconds since epoch
	 */
	public atimeMs: T;

	public get atime(): Date {
		return new Date(Number(this.atimeMs));
	}

	public set atime(value: Date) {
		this.atimeMs = this._convert(value.getTime());
	}

	/**
	 * time of last modification, in milliseconds since epoch
	 */
	public mtimeMs: T;

	public get mtime(): Date {
		return new Date(Number(this.mtimeMs));
	}

	public set mtime(value: Date) {
		this.mtimeMs = this._convert(value.getTime());
	}

	/**
	 * time of last time file status was changed, in milliseconds since epoch
	 */
	public ctimeMs: T;

	public get ctime(): Date {
		return new Date(Number(this.ctimeMs));
	}

	public set ctime(value: Date) {
		this.ctimeMs = this._convert(value.getTime());
	}

	/**
	 * time of file creation, in milliseconds since epoch
	 */
	public birthtimeMs: T;

	public get birthtime(): Date {
		return new Date(Number(this.birthtimeMs));
	}

	public set birthtime(value: Date) {
		this.birthtimeMs = this._convert(value.getTime());
	}

	/**
	 * Size of the item in bytes.
	 * For directories/symlinks, this is normally the size of the struct that represents the item.
	 */
	public size: T;

	/**
	 * Creates a new stats instance from a stats-like object. Can be used to copy stats (note)
	 */
	constructor({ atimeMs, mtimeMs, ctimeMs, birthtimeMs, uid, gid, size, mode, ino }: Partial<StatsLike> = {}) {
		const now = Date.now();
		this.atimeMs = this._convert(atimeMs ?? now);
		this.mtimeMs = this._convert(mtimeMs ?? now);
		this.ctimeMs = this._convert(ctimeMs ?? now);
		this.birthtimeMs = this._convert(birthtimeMs ?? now);
		this.uid = this._convert(uid ?? 0);
		this.gid = this._convert(gid ?? 0);
		this.size = this._convert(size ?? 0);
		this.ino = this._convert(ino ?? 0);
		this.mode = this._convert(mode ?? 0o644 & S_IFREG);

		if ((this.mode & S_IFMT) == 0) {
			this.mode = (this.mode | this._convert(S_IFREG)) as T;
		}
	}

	/**
	 * @returns true if this item is a file.
	 */
	public isFile(): boolean {
		return (this.mode & S_IFMT) === S_IFREG;
	}

	/**
	 * @returns True if this item is a directory.
	 */
	public isDirectory(): boolean {
		return (this.mode & S_IFMT) === S_IFDIR;
	}

	/**
	 * @returns true if this item is a symbolic link
	 */
	public isSymbolicLink(): boolean {
		return (this.mode & S_IFMT) === S_IFLNK;
	}

	// Currently unsupported

	public isSocket(): boolean {
		return (this.mode & S_IFMT) === S_IFSOCK;
	}

	public isBlockDevice(): boolean {
		return (this.mode & S_IFMT) === S_IFBLK;
	}

	public isCharacterDevice(): boolean {
		return (this.mode & S_IFMT) === S_IFCHR;
	}

	public isFIFO(): boolean {
		return (this.mode & S_IFMT) === S_IFIFO;
	}

	/**
	 * Checks if a given user/group has access to this item
	 * @param mode The requested access, combination of W_OK, R_OK, and X_OK
	 * @param cred The requesting credentials
	 * @returns True if the request has access, false if the request does not
	 * @internal
	 */
	public hasAccess(mode: number, cred: Cred): boolean {
		if (cred.euid === 0 || cred.egid === 0) {
			//Running as root
			return true;
		}

		// Mask for
		const adjusted = (cred.uid == this.uid ? S_IRWXU : 0) | (cred.gid == this.gid ? S_IRWXG : 0) | S_IRWXO;
		return (mode & this.mode & adjusted) == mode;
	}

	/**
	 * Convert the current stats object into a credentials object
	 * @internal
	 */
	public cred(uid: number = Number(this.uid), gid: number = Number(this.gid)): Cred {
		return {
			uid,
			gid,
			suid: Number(this.uid),
			sgid: Number(this.gid),
			euid: uid,
			egid: gid,
		};
	}

	/**
	 * Change the mode of the file. We use this helper function to prevent messing
	 * up the type of the file, which is encoded in mode.
	 * @internal
	 */
	public chmod(mode: number): void {
		this.mode = this._convert((this.mode & S_IFMT) | mode);
	}

	/**
	 * Change the owner user/group of the file.
	 * This function makes sure it is a valid UID/GID (that is, a 32 unsigned int)
	 * @internal
	 */
	public chown(uid: number | bigint, gid: number | bigint): void {
		uid = Number(uid);
		gid = Number(gid);
		if (!isNaN(uid) && 0 <= uid && uid < 2 ** 32) {
			this.uid = this._convert(uid);
		}
		if (!isNaN(gid) && 0 <= gid && gid < 2 ** 32) {
			this.gid = this._convert(gid);
		}
	}

	public get atimeNs(): bigint {
		return BigInt(this.atimeMs) * 1000n;
	}
	public get mtimeNs(): bigint {
		return BigInt(this.mtimeMs) * 1000n;
	}
	public get ctimeNs(): bigint {
		return BigInt(this.ctimeMs) * 1000n;
	}
	public get birthtimeNs(): bigint {
		return BigInt(this.birthtimeMs) * 1000n;
	}
}

/**
 * Implementation of Node's `Stats`.
 *
 * Attribute descriptions are from `man 2 stat'
 * @see http://nodejs.org/api/fs.html#fs_class_fs_stats
 * @see http://man7.org/linux/man-pages/man2/stat.2.html
 */
export class Stats extends StatsCommon<number> implements Node.Stats, StatsLike {
	protected _isBigint = false as const;
}
Stats satisfies typeof Node.Stats;

/**
 * Stats with bigint
 * @todo Implement with bigint instead of wrapping Stats
 * @internal
 */
export class BigIntStats extends StatsCommon<bigint> implements Node.BigIntStats, StatsLike {
	protected _isBigint = true as const;
}

/**
 * @internal
 */
export const ZenFsType = 0x7a656e6673; // 'z' 'e' 'n' 'f' 's'

/**
 * @hidden
 */
export class StatsFs implements Node.StatsFsBase<number> {
	/** Type of file system. */
	public type: number = 0x7a656e6673;
	/**  Optimal transfer block size. */
	public bsize: number = 4096;
	/**  Total data blocks in file system. */
	public blocks: number = 0;
	/** Free blocks in file system. */
	public bfree: number = 0;
	/** Available blocks for unprivileged users */
	public bavail: number = 0;
	/** Total file nodes in file system. */
	public files: number = size_max;
	/** Free file nodes in file system. */
	public ffree: number = size_max;
}

/**
 * @hidden
 */
export class BigIntStatsFs implements Node.StatsFsBase<bigint> {
	/** Type of file system. */
	public type: bigint = 0x7a656e6673n;
	/**  Optimal transfer block size. */
	public bsize: bigint = 4096n;
	/**  Total data blocks in file system. */
	public blocks: bigint = 0n;
	/** Free blocks in file system. */
	public bfree: bigint = 0n;
	/** Available blocks for unprivileged users */
	public bavail: bigint = 0n;
	/** Total file nodes in file system. */
	public files: bigint = BigInt(size_max);
	/** Free file nodes in file system. */
	public ffree: bigint = BigInt(size_max);
}
