import { FileStream, MemoryStream, Stream } from "ia-stream";
import { Readable } from "stream";
import * as zlib from "zlib";

const VERSION = 62;

const MAGIC = {
    // always at the beginning of the End of Central Directory record
    "ecdr": 0x06054b50,
    // signature at beginning of Local Header record
    "lfh": 0x04034b50,
    // signature at beginning of Central File Header record
    "cfh": 0x02014b50,
    // signature at beginning of Zip64 end of central directory locator
    "zip64ecdl": 0x07064b50,
    // signature at beginning of Zip64 end of central directory record
    "zip64ecdr": 0x06064b50
} as const;

/**
 * Searches for a magic number in the stream.
 * @param stream The stream to search for the magic number in.
 * @param magic The magic number, a 4-byte sequence that has a certain meaning.
 * @param offset The offset from the end at which to start looking for the magic number.
 */
async function locateMagicBackwards(stream: Stream, magic: number, offset?: number)
{
    // start at the end and seek backwards to look for magic
    // add 4 to start b/c magic is 4 bytes long
    await stream.seek(typeof offset === "number" ? stream.length - offset + 4 : stream.length);
    let view = 0;

    while (stream.position > 0)
    {
        const blockSize = Math.min(stream.position, 4096);
        await stream.seek(stream.position - blockSize);
        const block = await stream.read(blockSize, true);

        for (let i = blockSize - 1; i > 0; i--)
        {
            // shift over by a byte, add the new byte, clip to 4 bytes
            view = 0xFFFFFFFF & ((view << 8) | block[i]);
            if (view === magic)
                return i;
        }
    }

    return -1;
}

function hasBit(bitflag: number, bit: number)
{
    return (bitflag & (1 << bit)) === 1 << bit;
}

export enum ZipVendor
{
    MSDOS = 0,
    Amiga = 1,
    OpenVMS = 2,
    Unix = 3,
    VMCMS = 4,
    Atari = 5,
    OS2 = 6,
    Macintosh = 7,
    ZSystem = 8,
    CPM = 9,
    NTFS = 10,
    MVS = 11,
    VSE = 12,
    AcornRisc = 13,
    VFAT = 14,
    AlternateMVS = 15,
    BeOS = 16,
    Tandem = 17,
    OS400 = 18,
    OSX = 19
}

export enum ZipCompressionMethod
{
    None = 0,
    Shrunk = 1,
    Reduced1 = 2,
    Reduced2 = 3,
    Reduced3 = 4,
    Reduced4 = 5,
    Imploded = 6,
    Deflated = 8,
    EnhancedDeflated = 9,
    PKWareDCLImploded = 10,
    BZip2 = 12,
    LZMA = 14,
    IBMTerse = 18,
    IBMLZ77 = 19,
    PPMd = 98
}

export interface ZipEntryInfo
{
    vendor: ZipVendor | number;

    /**
     * The ZIP specification version of this file.
     */
    version: number;

    /**
     * The minimum ZIP specification version required to
     * open this file.
     */
    requiredVersion: number;

    flags: number;

    compressionMethod: ZipCompressionMethod;

    modificationTime: Date;

    crc32: number;

    compressedSize: number;

    uncompressedSize: number;

    fileName: string;

    fileComment: string;

    attributes: number;

    localHeaderOffset: number;
}

export interface ZipCentralDirectoryInfo
{
    currentDiskNumber: number;
    startDiskNumber: number;
    entriesOnCurrentDisk: number;
    totalEntries: number;
    centralDirectorySize: number;
    centralDirectoryOffset: number;
    comment: string;
    isZip64: boolean;
}

export class ZipReader
{
    private _stream!: Stream;
    private _centralDirInfo: ZipCentralDirectoryInfo | null = null;
    private _init: Promise<void>;

    private async init(source: Buffer | Stream | string)
    {
        if (typeof source === "string")
        {
            // we were given a file name
            this._stream = await FileStream.open(source, { flags: "r" });
        }
        else if (source instanceof Buffer)
        {
            this._stream = new MemoryStream({ data: source, readonly: true });

        }
        else
        {
            // we were given a stream
            this._stream = source;
        }
    }

    public constructor(data: Buffer);
    public constructor(filename: string);
    public constructor(stream: Stream);
    public constructor(source: Buffer | Stream | string)
    {
        this._init = this.init(source);
    }

    public async ready()
    {
        return this._init;
    }

    public async readInfo(): Promise<ZipCentralDirectoryInfo>
    {
        if (this._centralDirInfo)
            return this._centralDirInfo;

        const ecdrStart = await locateMagicBackwards(
            this._stream,
            MAGIC["ecdr"],
            22);

        if (ecdrStart < 0)
            throw new Error("Invalid ZIP file: could not find End of Central Directory signature.");

        const ecdr = await this._stream.readFrom(ecdrStart + 4, 18, true);

        let currentDiskNumber = ecdr.readUInt16LE(0);
        let startDiskNumber = ecdr.readUInt16LE(2);
        let entriesOnCurrentDisk = ecdr.readUInt16LE(4);
        let totalEntries = ecdr.readUInt16LE(6);
        let centralDirSize = ecdr.readUInt32LE(8);
        let centralDirOffset = ecdr.readUInt32LE(12);
        const commentLength = ecdr.readUInt16LE(16);
        const comment = (await this._stream.read(commentLength, true)).toString("ascii");

        if (entriesOnCurrentDisk !== totalEntries ||
            currentDiskNumber !== startDiskNumber)
            throw new Error("Multi-part ZIP files are not supported.");

        let isZip64 = false;

        // let's see if this is a Zip64 file
        const zip64Locator = await this._stream.readFrom(ecdrStart - 20, 20, true);

        if (zip64Locator.readUInt32LE(0) === MAGIC["zip64ecdl"])
        {
            isZip64 = true;
            const zip64ecdrOffset = Number(zip64Locator.readBigInt64LE(8));
            const zip64sig = await this._stream.readFrom(zip64ecdrOffset, 4, true);

            if (zip64sig.readUInt32LE(0) !== MAGIC["zip64ecdr"])
                throw new Error("The Zip64 ECDR signature is missing or in the wrong location.");

            const zip64ecdrSize = Number((await this._stream.read(8, true)).readBigInt64LE(0));
            const zip64ecdr = await this._stream.read(zip64ecdrSize, true);

            const version = zip64ecdr.readUInt16LE(0);
            const requiredVersion = zip64ecdr.readUInt16LE(2);

            if (requiredVersion > VERSION)
                throw new Error(
                    `This zip file requires ZIP version ${requiredVersion / 10}, but this ` +
                    `parser is only capable of reading ZIP version ${VERSION / 10}.`);

            currentDiskNumber = zip64ecdr.readUInt32LE(4);
            startDiskNumber = zip64ecdr.readUInt32LE(8);
            entriesOnCurrentDisk = Number(zip64ecdr.readBigInt64LE(12));
            totalEntries = Number(zip64ecdr.readBigInt64LE(20));
            centralDirSize = Number(zip64ecdr.readBigInt64LE(28));
            centralDirOffset = Number(zip64ecdr.readBigInt64LE(36));
        }

        this._centralDirInfo = {
            currentDiskNumber,
            startDiskNumber,
            entriesOnCurrentDisk,
            totalEntries,
            centralDirectorySize: centralDirSize,
            centralDirectoryOffset: centralDirOffset,
            comment,
            isZip64
        };

        return this._centralDirInfo;
    }

    public async* readEntries(): AsyncIterableIterator<ZipEntryInfo>
    {
        const { centralDirectoryOffset: centralDirOffset, entriesOnCurrentDisk } = await this.readInfo();

        // read the central dir
        await this._stream.seek(centralDirOffset);

        let signature;

        for (let i = 0; i < entriesOnCurrentDisk; i++)
        {
            signature = (await this._stream.read(4, true)).readUInt32LE(0);

            // check signature
            if (signature !== MAGIC["cfh"]) break;

            const fileHeader = await this._stream.read(42, true);

            const version = fileHeader[0];
            const vendor = fileHeader[1];
            const requiredVersion = fileHeader.readUInt16LE(2);
            const flags = fileHeader.readUInt16LE(4);
            const compressionMethod = fileHeader.readUInt16LE(6);
            const modTime = fileHeader.readUInt16LE(8);
            const modDate = fileHeader.readUInt16LE(10);
            const crc32 = fileHeader.readUInt32LE(12);
            let compressedSize = fileHeader.readUInt32LE(16);
            let uncompressedSize = fileHeader.readUInt32LE(20);
            const filenameLength = fileHeader.readUInt16LE(24);
            const extraLength = fileHeader.readUInt16LE(26);
            const fileCommentLength = fileHeader.readUInt16LE(28);
            let startDisk = fileHeader.readUInt16LE(30);
            const internalAttributes = fileHeader.readUInt16LE(32);
            const externalAttributes = fileHeader.readUInt32LE(34);
            let localHeaderOffset = fileHeader.readUInt32LE(38);

            const fileName = (await this._stream.read(filenameLength)).toString("utf-8");
            const extra = await this._stream.read(extraLength);
            const fileComment = (await this._stream.read(fileCommentLength)).toString("utf-8");

            // parse date
            const timeSeconds = (modTime & 0x001F) * 2;
            const timeMinutes = (modTime & 0x03E0) >> 5;
            const timeHours = (modTime & 0x7C00) >> 11;

            const dateDay = modDate & 0x001F;
            const dateMonth = (modDate & 0x00E0) >> 5;
            const dateYear = ((modDate & 0x7F00) >> 9) + 1980;

            const modDateTime = new Date(dateYear,
                dateMonth,
                dateDay,
                timeHours,
                timeMinutes,
                timeSeconds);

            // parse extras
            let extraOffset = 0;

            while (extraOffset < extraLength)
            {
                const extraHeader = extra.readUInt16LE(extraOffset);
                const extraSize = extra.readUInt16LE(extraOffset + 2);

                switch (extraHeader)
                {
                    case 0x0001: // Zip64 extended info
                        // the fields only appear if the normal field is set to 0xFFFFFFFF
                        // so we need a cursor
                        let cursor = 0;

                        if (uncompressedSize === 0xFFFFFFFF)
                        {
                            uncompressedSize = Number(extra.readBigUInt64LE(cursor + 4));
                            cursor += 8;
                        }

                        if (compressedSize === 0xFFFFFFFF)
                        {
                            compressedSize = Number(extra.readBigUInt64LE(cursor + 4));
                            cursor += 8;
                        }

                        if (localHeaderOffset === 0xFFFFFFFF)
                        {
                            localHeaderOffset = Number(extra.readBigUInt64LE(cursor + 4));
                            cursor += 8;
                        }

                        if (startDisk === 0xFFFF)
                        {
                            startDisk = extra.readUInt32LE(cursor + 4);
                        }
                        break;
                    default: // ignore
                        break;
                }

                extraOffset += extraSize + 4;
            }

            yield {
                vendor,
                version,
                requiredVersion,
                compressedSize,
                uncompressedSize,
                modificationTime: modDateTime,
                attributes: externalAttributes,
                compressionMethod,
                crc32,
                fileComment,
                fileName,
                flags,
                localHeaderOffset
            };
        }
    }


    public async readEntry(entry: ZipEntryInfo): Promise<Readable>
    {
        const localHeader = await this._stream.readFrom(entry.localHeaderOffset, 30);

        if (localHeader.readInt32LE(0) !== MAGIC["lfh"])
            throw new Error("Invalid ZIP file: the local file header was not found.");

        const flags = localHeader.readInt16LE(6);
        const compressionMethod = localHeader.readInt16LE(8);
        const filenameLength = localHeader.readInt16LE(26);
        const extraLength = localHeader.readInt16LE(28);
        let fileSize = entry.compressedSize;

        // skipping all of the parsing b/c we already have this info
        let skip = filenameLength + extraLength;

        if (hasBit(flags, 3)) // skip the data descriptor
            skip += 12;

        const fileStart = entry.localHeaderOffset + 30 + skip;
        const fileEnd = fileStart + fileSize;
        const fileStream = await this._stream.substream(fileStart, fileEnd);

        switch (compressionMethod)
        {
            case ZipCompressionMethod.None:
                return fileStream.asNodeStream();
            case ZipCompressionMethod.Deflated:
                return fileStream.asNodeStream().pipe(zlib.createInflateRaw());
            default:
                throw new Error(`Compression method 0x${compressionMethod.toString(16).padStart(2, "0")} is not implemented`)
        }
    }

    public async close()
    {
        return this._stream.close();
    }
}