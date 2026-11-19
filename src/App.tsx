import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AccountsPage } from './pages/Accounts'
import { Shell } from './components/Shell'
import { ToastProvider } from './components/ui/Toast'
import { LiveProvider } from './live/LiveProvider'
import { createQueryClient } from './queryClient'
import { HomePage } from './pages/Home'
import { LogPage } from './pages/Log'
import { NotFoundPage } from './pages/NotFound'
import { OrphanedPage } from './pages/Orphaned'
import { QueuePage } from './pages/Queue'
import { SourceDetailPage } from './pages/SourceDetail'
import { SourcesPage } from './pages/Sources'
import { WatchPage } from './pages/Watch'

export default function App() {
	const [client] = useState(createQueryClient)
	return (
		<QueryClientProvider client={client}>
			<ToastProvider>
				<LiveProvider>
					<BrowserRouter>
						<Routes>
							<Route element={<Shell />}>
								<Route index element={<HomePage />} />
								<Route path="queue" element={<QueuePage />} />
								<Route path="sources" element={<SourcesPage />} />
								<Route path="sources/:id" element={<SourceDetailPage />} />
								<Route path="watch/:id" element={<WatchPage />} />
								<Route path="accounts" element={<AccountsPage />} />
								<Route path="orphaned" element={<OrphanedPage />} />
								<Route path="log" element={<LogPage />} />
								<Route path="*" element={<NotFoundPage />} />
							</Route>
						</Routes>
					</BrowserRouter>
				</LiveProvider>
			</ToastProvider>
		</QueryClientProvider>
	)
}
