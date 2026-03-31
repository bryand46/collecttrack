import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
    }

    // Fetch the image from the external URL
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(url).origin,
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
    }

    const contentType = res.headers.get('content-type') ?? ''

    // Reject anything that isn't an image (e.g. HTML error pages)
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: `Not an image (got ${contentType})` }, { status: 400 })
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    // Determine file extension from content type
    const ext = contentType.includes('png') ? 'png'
      : contentType.includes('webp') ? 'webp'
      : contentType.includes('gif') ? 'gif'
      : 'jpg'

    const filename = `${randomUUID()}.${ext}`
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    return NextResponse.json({ localUrl: `/uploads/${filename}` })
  } catch (err) {
    console.error('download-image error:', err)
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 })
  }
}
