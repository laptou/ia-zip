import { expect } from "chai";
import { resolve } from "path";
import { ZipReader } from "./parser";

describe("zip reader", () =>
{

    describe("simple.zip", () =>
    {
        let reader!: ZipReader;

        beforeEach(async () =>
        {
            reader = new ZipReader(resolve(__dirname, "../test/files/simple.zip"));
            await reader.ready();
        });

        afterEach(async () =>
        {
            await reader.close();
        });

        it("should list entries correctly", async () =>
        {
            const entries = [];

            for await (const entry of reader.readEntries())
            {
                entries.push(entry);
            }

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].fileName).to.equal("simple.txt");
            expect(entries[0].uncompressedSize).to.equal(28);
        });

        it("should unzip entries correctly", async () =>
        {
            const entries = [];

            for await (const entry of reader.readEntries())
            {
                const stream = await reader.readEntry(entry);
                let text = "";

                for await (const data of stream)
                {
                    text += data.toString("utf-8");
                }

                entries.push({ name: entry.fileName, text });
            }

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].name).to.equal("simple.txt");
            expect(entries[0].text).to.equal("this is a simple text file \n");
        });
    });

    describe("simple64.zip", () =>
    {
        let reader!: ZipReader;

        beforeEach(async () =>
        {
            reader = new ZipReader(resolve(__dirname, "../test/files/simple64.zip"));
            await reader.ready();
        });

        afterEach(async () =>
        {
            await reader.close();
        });

        it("should have isZip64 = true", async () =>
        {
            const info = await reader.readInfo();
            expect(info.isZip64).to.be.true;
        })

        it("should list entries correctly", async () =>
        {
            const entries = [];

            for await (const entry of reader.readEntries())
            {
                entries.push(entry);
            }

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].fileName).to.equal("simple.txt");
            expect(entries[0].uncompressedSize).to.equal(28);
        });

        it("should unzip entries correctly", async () =>
        {
            const entries = [];

            for await (const entry of reader.readEntries())
            {
                const stream = await reader.readEntry(entry);
                let text = "";

                for await (const data of stream)
                {
                    text += data.toString("utf-8");
                }

                entries.push({ name: entry.fileName, text });
            }

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].name).to.equal("simple.txt");
            expect(entries[0].text).to.equal("this is a simple text file \n");
        });
    });

    describe("folder.zip", () =>
    {
        let reader!: ZipReader;

        beforeEach(async () =>
        {
            reader = new ZipReader(resolve(__dirname, "../test/files/folder.zip"));
            await reader.ready();
        });

        afterEach(async () =>
        {
            await reader.close();
        });

        it("should list entries correctly", async () =>
        {
            const entries = [];

            for await (const entry of reader.readEntries())
            {
                entries.push(entry);
            }

            expect(entries).to.have.lengthOf(7);
            console.log(entries);
        });
    });

});