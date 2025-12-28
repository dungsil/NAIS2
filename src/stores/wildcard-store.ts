import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/indexed-db'

export interface WildcardFile {
    id: string
    name: string           // 파일 이름 (확장자 제외) - 와일드카드 참조명
    folder: string         // 폴더 경로 (빈 문자열이면 루트)
    content: string[]      // 각 줄의 내용
    createdAt: number
    updatedAt: number
}

interface WildcardState {
    // 와일드카드 파일 목록
    files: WildcardFile[]

    // 순차 와일드카드용 카운터 (세션 간 유지)
    sequentialCounters: Record<string, number>

    // Actions - CRUD
    addFile: (name: string, folder?: string, content?: string[]) => WildcardFile
    updateFile: (id: string, updates: Partial<Pick<WildcardFile, 'name' | 'folder' | 'content'>>) => void
    deleteFile: (id: string) => void
    duplicateFile: (id: string) => WildcardFile | null

    // Actions - Content
    getFileByPath: (path: string) => WildcardFile | undefined
    getRandomLine: (path: string) => string | null
    getSequentialLine: (path: string) => string | null
    resetSequentialCounter: (path?: string) => void

    // Actions - Folder
    getFolders: () => string[]
    getFilesInFolder: (folder: string) => WildcardFile[]

    // Import/Export
    importFromText: (name: string, text: string, folder?: string) => WildcardFile
    exportToText: (id: string) => string | null
}

export const useWildcardStore = create<WildcardState>()(
    persist(
        (set, get) => ({
            files: [],
            sequentialCounters: {},

            addFile: (name, folder = '', content = []) => {
                const newFile: WildcardFile = {
                    id: Date.now().toString(),
                    name: name.trim(),
                    folder: folder.trim(),
                    content,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }
                set((state) => ({
                    files: [...state.files, newFile]
                }))
                return newFile
            },

            updateFile: (id, updates) => {
                set((state) => ({
                    files: state.files.map((f) =>
                        f.id === id
                            ? { ...f, ...updates, updatedAt: Date.now() }
                            : f
                    )
                }))
            },

            deleteFile: (id) => {
                set((state) => ({
                    files: state.files.filter((f) => f.id !== id)
                }))
            },

            duplicateFile: (id) => {
                const file = get().files.find(f => f.id === id)
                if (!file) return null

                const newFile: WildcardFile = {
                    id: Date.now().toString(),
                    name: `${file.name}_copy`,
                    folder: file.folder,
                    content: [...file.content],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }
                set((state) => ({
                    files: [...state.files, newFile]
                }))
                return newFile
            },

            getFileByPath: (path) => {
                const { files } = get()
                // path 형식: "folder/name" 또는 "name"
                const normalizedPath = path.trim().toLowerCase()

                return files.find(f => {
                    const filePath = f.folder
                        ? `${f.folder}/${f.name}`.toLowerCase()
                        : f.name.toLowerCase()
                    return filePath === normalizedPath || f.name.toLowerCase() === normalizedPath
                })
            },

            getRandomLine: (path) => {
                const file = get().getFileByPath(path)
                if (!file || file.content.length === 0) return null

                const randomIndex = Math.floor(Math.random() * file.content.length)
                return file.content[randomIndex]
            },

            getSequentialLine: (path) => {
                const file = get().getFileByPath(path)
                if (!file || file.content.length === 0) return null

                const { sequentialCounters } = get()
                const currentIndex = sequentialCounters[path] || 0
                const line = file.content[currentIndex % file.content.length]

                // 카운터 증가
                set((state) => ({
                    sequentialCounters: {
                        ...state.sequentialCounters,
                        [path]: currentIndex + 1
                    }
                }))

                return line
            },

            resetSequentialCounter: (path) => {
                if (path) {
                    set((state) => {
                        const newCounters = { ...state.sequentialCounters }
                        delete newCounters[path]
                        return { sequentialCounters: newCounters }
                    })
                } else {
                    set({ sequentialCounters: {} })
                }
            },

            getFolders: () => {
                const { files } = get()
                const folders = new Set<string>()
                files.forEach(f => {
                    if (f.folder) folders.add(f.folder)
                })
                return Array.from(folders).sort()
            },

            getFilesInFolder: (folder) => {
                const { files } = get()
                return files.filter(f => f.folder === folder)
            },

            importFromText: (name, text, folder = '') => {
                const lines = text
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'))  // 주석 제외

                return get().addFile(name, folder, lines)
            },

            exportToText: (id) => {
                const file = get().files.find(f => f.id === id)
                if (!file) return null
                return file.content.join('\n')
            },
        }),
        {
            name: 'nais2-wildcards',
            storage: createJSONStorage(() => indexedDBStorage),
        }
    )
)

/**
 * 와일드카드 경로 정규화
 * "folder/name" 또는 "name" 형식으로 변환
 */
export function normalizeWildcardPath(path: string): string {
    return path.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}
