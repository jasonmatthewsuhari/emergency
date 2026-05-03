'use client'

import { ChangeEvent, useEffect, useState } from 'react'

type SelectedImage = {
  file: File
  previewUrl: string
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export default function StartPage() {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)

  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage.previewUrl)
      }
    }
  }, [selectedImage])

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedImage(null)
      return
    }

    setSelectedImage((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl)
      }

      return {
        file,
        previewUrl: URL.createObjectURL(file),
      }
    })
  }

  return (
    <main className="start-shell">
      <section className="start-panel" aria-labelledby="start-title">
        <div className="start-copy">
          <p className="start-eyebrow">Sightline</p>
          <h1 id="start-title">Start with an image</h1>
          <p>Upload a local image file to prepare it for Sightline analysis.</p>
        </div>

        <label className="start-dropzone">
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <span className="start-dropzone__icon" aria-hidden="true">
            +
          </span>
          <span className="start-dropzone__title">Choose image file</span>
          <span className="start-dropzone__hint">PNG, JPG, WebP, or any browser-supported image</span>
        </label>

        {selectedImage ? (
          <div className="start-selection">
            <div>
              <span>Selected file</span>
              <strong>{selectedImage.file.name}</strong>
              <small>
                {selectedImage.file.type || 'Image file'} - {formatBytes(selectedImage.file.size)}
              </small>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="start-preview" src={selectedImage.previewUrl} alt="Selected image preview" />
          </div>
        ) : null}
      </section>
    </main>
  )
}
