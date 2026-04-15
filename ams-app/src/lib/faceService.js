'use client'

import * as faceapi from 'face-api.js'

let modelsLoaded = false
let modelsLoading = false
let loadPromise = null

/**
 * Load face-api.js models (idempotent — only loads once)
 * Models are served from /models/ in the public directory
 */
export async function loadModels() {
  if (modelsLoaded) return true
  if (modelsLoading) return loadPromise

  modelsLoading = true
  loadPromise = (async () => {
    try {
      const MODEL_URL = '/models'
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      modelsLoaded = true
      console.log('face-api.js models loaded successfully')
      return true
    } catch (err) {
      console.error('Failed to load face-api.js models:', err)
      modelsLoading = false
      loadPromise = null
      throw err
    }
  })()

  return loadPromise
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded() {
  return modelsLoaded
}

/**
 * Detect a single face and extract its 128-dim descriptor from a video or canvas element
 * @param {HTMLVideoElement|HTMLCanvasElement} input - The video/canvas element to detect from
 * @returns {Float32Array|null} - The face descriptor or null if no face detected
 */
export async function getDescriptor(input) {
  if (!modelsLoaded) {
    throw new Error('Models not loaded. Call loadModels() first.')
  }

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null
  return detection.descriptor
}

/**
 * Extract descriptor from a video element by drawing a frame to a temporary canvas
 * This is useful when working with react-webcam
 * @param {HTMLVideoElement} videoEl - The video element
 * @returns {Float32Array|null} - The descriptor or null
 */
export async function getDescriptorFromVideo(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return null

  // Draw current video frame to a canvas
  const canvas = document.createElement('canvas')
  canvas.width = videoEl.videoWidth
  canvas.height = videoEl.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoEl, 0, 0)

  return getDescriptor(canvas)
}

/**
 * Compare two descriptors and return the Euclidean distance
 * Lower distance = more similar. Typically < 0.6 is a match.
 * @param {Float32Array|number[]} descriptor1 
 * @param {Float32Array|number[]} descriptor2 
 * @returns {number} Euclidean distance
 */
export function compareDescriptors(descriptor1, descriptor2) {
  const d1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1)
  const d2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2)
  return faceapi.euclideanDistance(d1, d2)
}

/**
 * Create a FaceMatcher from labeled descriptors
 * @param {Array<{label: string, descriptor: number[]}>} labeledDescriptors 
 * @param {number} threshold - Max distance to consider a match (default 0.6)
 * @returns {faceapi.FaceMatcher}
 */
export function createMatcher(labeledDescriptors, threshold = 0.6) {
  const labeled = labeledDescriptors.map(
    (ld) => new faceapi.LabeledFaceDescriptors(
      ld.label,
      [new Float32Array(ld.descriptor)]
    )
  )
  return new faceapi.FaceMatcher(labeled, threshold)
}

export { faceapi }
