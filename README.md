# `ia-zip`

[![npm](https://img.shields.io/npm/v/ia-zip.svg?style=for-the-badge)](https://www.npmjs.com/package/ia-zip)
![license](https://img.shields.io/npm/l/ia-zip.svg?style=for-the-badge)

This package provides an API for reading and writing ZIP files.

> **Note**: this package is a work in progress. Right now, you can only read zip files.

# API
Docs generated using [`docts`](https://github.com/charto/docts)
>
> <a name="api-ZipCentralDirectoryInfo"></a>
> ### Interface [`ZipCentralDirectoryInfo`](#api-ZipCentralDirectoryInfo)
> Source code: [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L135-L145)  
>  
> Properties:  
> > **.currentDiskNumber** <sup><code>number</code></sup>  
> > **.startDiskNumber** <sup><code>number</code></sup>  
> > **.entriesOnCurrentDisk** <sup><code>number</code></sup>  
> > **.totalEntries** <sup><code>number</code></sup>  
> > **.centralDirectorySize** <sup><code>number</code></sup>  
> > **.centralDirectoryOffset** <sup><code>number</code></sup>  
> > **.comment** <sup><code>string</code></sup>  
> > **.isZip64** <sup><code>boolean</code></sup>  
>
> <a name="api-ZipEntryInfo"></a>
> ### Interface [`ZipEntryInfo`](#api-ZipEntryInfo)
> Source code: [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L99-L133)  
>  
> Properties:  
> > **.vendor** <sup><code>number</code></sup>  
> > **.version** <sup><code>number</code></sup>  
> > &emsp;<em>The ZIP specification version of this file.</em>  
> > **.requiredVersion** <sup><code>number</code></sup>  
> > &emsp;<em>The minimum ZIP specification version required to</em>  
> > &emsp;<em>open this file.</em>  
> > **.flags** <sup><code>number</code></sup>  
> > **.compressionMethod** <sup><code>(undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) | (undefined)</code></sup>  
> > **.modificationTime** <sup><code>Date</code></sup>  
> > **.crc32** <sup><code>number</code></sup>  
> > **.compressedSize** <sup><code>number</code></sup>  
> > **.uncompressedSize** <sup><code>number</code></sup>  
> > **.fileName** <sup><code>string</code></sup>  
> > **.fileComment** <sup><code>string</code></sup>  
> > **.attributes** <sup><code>number</code></sup>  
> > **.localHeaderOffset** <sup><code>number</code></sup>  
>
> <a name="api-ZipReader"></a>
> ### Class [`ZipReader`](#api-ZipReader)
> Source code: [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L147-L418)  
>  
> Methods:  
> > **new( )** <sup>&rArr; <code>[ZipReader](#api-ZipReader)</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L172)  
> > &emsp;&#x25aa; data <sup><code>Buffer</code></sup>  
> > **new( )** <sup>&rArr; <code>[ZipReader](#api-ZipReader)</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L173)  
> > &emsp;&#x25aa; filename <sup><code>string</code></sup>  
> > **new( )** <sup>&rArr; <code>[ZipReader](#api-ZipReader)</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L174)  
> > &emsp;&#x25aa; stream <sup><code>Stream</code></sup>  
> > **.ready( )** <sup>&rArr; <code>Promise&lt;void&gt;</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L180-L183)  
> > **.readInfo( )** <sup>&rArr; <code>Promise&lt;[ZipCentralDirectoryInfo](#api-ZipCentralDirectoryInfo)&gt;</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L185-L258)  
> > **.readEntries( )** <sup>&rArr; <code>AsyncIterableIterator&lt;[ZipEntryInfo](#api-ZipEntryInfo)&gt;</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L260-L377)  
> > **.readEntry( )** <sup>&rArr; <code>Promise&lt;Readable&gt;</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L380-L412)  
> > &emsp;&#x25aa; entry <sup><code>[ZipEntryInfo](#api-ZipEntryInfo)</code></sup>  
> > **.close( )** <sup>&rArr; <code>Promise&lt;void&gt;</code></sup> [`<>`](http://github.com/laptou/ia-zip/blob/fdde2bc/src/parser.ts#L414-L417)  
