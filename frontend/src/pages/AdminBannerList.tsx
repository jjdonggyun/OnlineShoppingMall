// src/pages/AdminBannerList.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav';

type Row = {
    id: string; title?: string; image: string; imageMobile?: string; link?: string;
    active: boolean; order: number; startsAt?: string; endsAt?: string; device: 'ALL' | 'WEB' | 'MOBILE';
}

export default function AdminBannerList() {
    const qc = useQueryClient()
    const { data, isLoading } = useQuery<Row[]>({
        queryKey: ['admin', 'banners'],
        queryFn: async () => {
            const r = await fetch('/api/banners/admin/list', { credentials: 'include' })
            if (!r.ok) throw new Error('UNAUTHORIZED')
            return r.json()
        }
    })

    const del = useMutation({
        mutationFn: async (id: string) => {
            const r = await fetch(`/api/banners/admin/${id}`, { method: 'DELETE', credentials: 'include' })
            if (!r.ok) throw new Error('DELETE_FAIL')
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'banners'] })
    })

    if (isLoading) return <div className="container-max py-10">불러오는 중…</div>

    return (
        <div className="min-h-screen bg-white text-[#222]">
            <Nav />
            <div className="container-max py-10">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">배너 관리</h1>
                    <Link to="/admin/banners/new" className="px-3 py-2 rounded bg-black text-white">배너 추가</Link>
                </div>

                {!data?.length ? (
                    <div className="text-gray-600">배너가 없습니다.</div>
                ) : (
                    <ul className="divide-y">
                        {data.map(b => (
                            <li key={b.id} className="py-3 flex items-center gap-4">
                                <img src={b.image} className="w-24 h-16 object-cover rounded" />
                                <div className="flex-1">
                                    <div className="font-medium">
                                        {b.title || '(제목 없음)'} {b.active ? null : <span className="ml-2 text-xs text-rose-600">비활성</span>}
                                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 align-middle">{b.device}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">order: {b.order} {b.startsAt && ` | ${b.startsAt.slice(0, 10)}`} {b.endsAt && ` ~ ${b.endsAt.slice(0, 10)}`}</div>
                                </div>
                                <Link to={`/admin/banners/${b.id}/edit`} className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm">편집</Link>
                                <button onClick={() => confirm('삭제할까요?') && del.mutate(b.id)} className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm text-red-600">삭제</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
