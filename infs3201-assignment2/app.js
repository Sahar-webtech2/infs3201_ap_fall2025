const fs = require('fs').promises
const prompt = require('prompt-sync')({ sigint: true })

const PHOTOS_FILE = 'photos.json'
const ALBUMS_FILE = 'albums.json'

/**
 * Read and parse a JSON file
 * @param {string} filePath
 * @returns {Promise<any|null>} parsed JSON or null on error
 */
async function readJson(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8')
        return JSON.parse(content)
    } catch (err) {
        console.log('Error reading file', filePath, '-', err.message)
        return null
    }
}

/**
 * Write data as JSON to a file
 * @param {string} filePath
 * @param {any} data
 * @returns {Promise<void>}
 */
async function writeJson(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (err) {
        console.log('Error writing file', filePath, '-', err.message)
    }
}

/**
 * Find a photo object in photos array by numeric id
 * @param {Array} photos
 * @param {number} id
 * @returns {Object|null}
 */
function findPhotoById(photos, id) {
    if (!Array.isArray(photos)) {
        return null
    }
    for (let i = 0; i < photos.length; i++) {
        if (photos[i].id === id) {
            return photos[i]
        }
    }
    return null
}

/**
 * Convert a timestamp number to 'Month day, Year' string
 * @param {number} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
    if (timestamp === undefined || timestamp === null) {
        return 'Unknown'
    }
    const d = new Date(Number(timestamp))
    if (isNaN(d.getTime())) {
        return 'Invalid date'
    }
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Display the required photo fields (filename, title, date, albums, tags)
 * @param {Object} photo
 * @param {Array} albums
 * @returns {void}
 */
function displayPhoto(photo, albums) {
    if (!photo) {
        console.log('No photo to display')
        return
    }
    console.log('Filename: ' + (photo.filename || ''))
    console.log('Title: ' + (photo.title || ''))
    console.log('Date: ' + formatDate(photo.date))

    // Build album list (album names)
    const albumIds = photo.albums || []
    let albumNames = []
    for (let i = 0; i < albumIds.length; i++) {
        const aId = albumIds[i]
        for (let j = 0; j < albums.length; j++) {
            if (albums[j].id === aId) {
                albumNames.push(albums[j].name)
                break
            }
        }
    }
    let albumStr = ''
    for (let i = 0; i < albumNames.length; i++) {
        albumStr += albumNames[i]
        if (i < albumNames.length - 1) {
            albumStr += ', '
        }
    }
    console.log('Albums: ' + (albumStr || 'None'))

    // Tags comma separated
    const tags = photo.tags || []
    let tagStr = ''
    for (let i = 0; i < tags.length; i++) {
        tagStr += tags[i]
        if (i < tags.length - 1) {
            tagStr += ', '
        }
    }
    console.log('Tags: ' + (tagStr || 'None'))
}

/**
 * Feature: Find Photo (menu option 1)
 * Asks for ID, loads files and displays photo info
 * @returns {Promise<void>}
 */
async function findPhotoFeature() {
    const idInput = prompt('Photo ID? ')
    const id = parseInt(idInput, 10)
    if (isNaN(id)) {
        console.log('Invalid ID')
        return
    }
    const photos = await readJson(PHOTOS_FILE)
    const albums = await readJson(ALBUMS_FILE)
    if (!photos || !albums) {
        console.log('Could not load data files')
        return
    }
    const photo = findPhotoById(photos, id)
    if (!photo) {
        console.log('Photo not found')
        return
    }
    displayPhoto(photo, albums)
}

/**
 * Feature: Update Photo Details (menu option 2)
 * Allows updating title and description with 'press enter to keep existing' behavior
 * @returns {Promise<void>}
 */
async function updatePhotoDetailsFeature() {
    const idInput = prompt('Photo ID? ')
    const id = parseInt(idInput, 10)
    if (isNaN(id)) {
        console.log('Invalid ID')
        return
    }
    const photos = await readJson(PHOTOS_FILE)
    if (!photos) {
        console.log('Could not load photos')
        return
    }
    let index = -1
    for (let i = 0; i < photos.length; i++) {
        if (photos[i].id === id) {
            index = i
            break
        }
    }
    if (index === -1) {
        console.log('Photo not found')
        return
    }
    const photo = photos[index]
    console.log('Press enter to reuse existing value.')
    const newTitle = prompt('Enter value for title [' + (photo.title || '') + ']: ')
    if (newTitle.trim() !== '') {
        photo.title = newTitle
    }
    const newDesc = prompt('Enter value for description [' + (photo.description || '') + ']: ')
    if (newDesc.trim() !== '') {
        photo.description = newDesc
    }
    photos[index] = photo
    await writeJson(PHOTOS_FILE, photos)
    console.log('Photo updated')
}

/**
 * Feature: Album Photo List (menu option 3)
 * Asks for album name (case-insensitive) and prints CSV-like output
 * @returns {Promise<void>}
 */
async function albumPhotoListFeature() {
    const albumNameInput = prompt('What is the name of the album? ')
    if (albumNameInput.trim() === '') {
        console.log('Album name required')
        return
    }
    const albums = await readJson(ALBUMS_FILE)
    const photos = await readJson(PHOTOS_FILE)
    if (!albums || !photos) {
        console.log('Could not load data')
        return
    }
    let foundAlbum = null
    for (let i = 0; i < albums.length; i++) {
        if (albums[i].name && albums[i].name.toLowerCase() === albumNameInput.trim().toLowerCase()) {
            foundAlbum = albums[i]
            break
        }
    }
    if (!foundAlbum) {
        console.log('Album not found')
        return
    }

    console.log('filename,resolution,tags')
    for (let i = 0; i < photos.length; i++) {
        const p = photos[i]
        const pAlbums = p.albums || []
        let belongs = false
        for (let j = 0; j < pAlbums.length; j++) {
            if (pAlbums[j] === foundAlbum.id) {
                belongs = true
                break
            }
        }
        if (!belongs) {
            continue
        }
        // resolution may be string or array
        let resolution = ''
        if (Array.isArray(p.resolution)) {
            resolution = String(p.resolution[0]) + 'x' + String(p.resolution[1])
        } else {
            resolution = p.resolution || ''
        }
        const tags = p.tags || []
        let tagLine = ''
        for (let k = 0; k < tags.length; k++) {
            tagLine += tags[k]
            if (k < tags.length - 1) {
                tagLine += ':'
            }
        }
        console.log(p.filename + ',' + resolution + ',' + tagLine)
    }
}

/**
 * Feature: Tag Photo (menu option 4)
 * Adds a single tag to a photo unless it already exists (case-insensitive)
 * @returns {Promise<void>}
 */
async function tagPhotoFeature() {
    const idInput = prompt('What photo ID to tag? ')
    const id = parseInt(idInput, 10)
    if (isNaN(id)) {
        console.log('Invalid ID')
        return
    }
    const tagInput = prompt('What tag to add (single tag)? ')
    if (tagInput.trim() === '') {
        console.log('Tag cannot be empty')
        return
    }
    const tagToAdd = tagInput.trim()
    const photos = await readJson(PHOTOS_FILE)
    if (!photos) {
        console.log('Could not load photos')
        return
    }
    let index = -1
    for (let i = 0; i < photos.length; i++) {
        if (photos[i].id === id) {
            index = i
            break
        }
    }
    if (index === -1) {
        console.log('Photo not found')
        return
    }
    const tags = photos[index].tags || []
    let duplicate = false
    for (let i = 0; i < tags.length; i++) {
        if (String(tags[i]).toLowerCase() === tagToAdd.toLowerCase()) {
            duplicate = true
            break
        }
    }
    if (duplicate) {
        console.log('Tag already exists, no changes made')
        return
    }
    tags.push(tagToAdd)
    photos[index].tags = tags
    await writeJson(PHOTOS_FILE, photos)
    console.log('Updated!')
}

/**
 * Print menu and run selected feature. Loops until user selects Exit.
 * @returns {Promise<void>}
 */
async function main() {
    try {
        console.log('Digital Media Catalog - INFS3201')
        while (true) {
            console.log('')
            console.log('1. Find Photo')
            console.log('2. Update Photo Details')
            console.log('3. Album Photo List')
            console.log('4. Tag Photo')
            console.log('5. Exit')
            const selection = prompt('Your selection> ').trim()
            if (selection === '1') {
                await findPhotoFeature()
            } else if (selection === '2') {
                await updatePhotoDetailsFeature()
            } else if (selection === '3') {
                await albumPhotoListFeature()
            } else if (selection === '4') {
                await tagPhotoFeature()
            } else if (selection === '5') {
                console.log('Goodbye')
                break
            } else {
                console.log('Invalid selection')
            }
        }
    } catch (err) {
        console.log('Unexpected error', err && err.message ? err.message : err)
    }
}

main()
