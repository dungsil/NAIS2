import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/indexed-db'

export interface LibraryItem {
    id: string
    name: string
    path: string
    width: number
    height: number
    createdAt: number
}

interface LibraryState {
    items: LibraryItem[]
    draggedSource: { name: string, path: string } | null
    gridColumns: number

    setGridColumns: (columns: number) => void

    addItem: (item: LibraryItem) => void
    removeItem: (id: string) => void
    setItems: (items: LibraryItem[]) => void
    updateItem: (id: string, updates: Partial<LibraryItem>) => void
    setDraggedSource: (source: { name: string, path: string } | null) => void
}

export const useLibraryStore = create<LibraryState>()(
    persist(
        (set) => ({
            items: [],
            draggedSource: null,
            gridColumns: 4,

            setGridColumns: (columns) => set({ gridColumns: columns }),

            addItem: (item) => set((state) => ({
                items: [item, ...state.items]
            })),

            removeItem: (id) => set((state) => ({
                items: state.items.filter((item) => item.id !== id)
            })),

            setItems: (items) => set({ items }),

            updateItem: (id, updates) => set((state) => ({
                items: state.items.map((item) =>
                    item.id === id ? { ...item, ...updates } : item
                )
            })),

            setDraggedSource: (source) => set({ draggedSource: source }),
        }),
        {
            name: 'nais-library-storage',
            storage: createJSONStorage(() => indexedDBStorage),
            partialize: (state) => ({ items: state.items, gridColumns: state.gridColumns }), // Don't persist draggedSource
        }
    )
)
