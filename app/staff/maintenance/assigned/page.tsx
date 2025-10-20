// app/staff/maintenance/assigned/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StaffNavbar from '@/app/components/StaffNavbar'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Wrench, 
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Filter
} from 'lucide-react'

interface MaintenanceTask {
  id: number
  log_reference: string
  issue_description: string
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  status: string
  created_at: string
  room_number: string
  room_type: string
  branch_name: string
  notes?: string
}

export default function StaffAssignedTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('pending')
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [filter])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/staff/maintenance/assigned?filter=${filter}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTask = async (taskId: number) => {
    try {
      setActionLoading(taskId)
      const response = await fetch(`/api/staff/maintenance/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'InProgress' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start task')
      }
      
      await fetchTasks()
    } catch (error: any) {
      console.error('Error starting task:', error)
      alert(error.message || 'Failed to start task')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteTask = async (taskId: number) => {
    if (!completionNotes.trim()) {
      alert('Please add completion notes')
      return
    }

    try {
      setActionLoading(taskId)
      const response = await fetch(`/api/staff/maintenance/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resolution_notes: completionNotes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete task')
      }
      
      const result = await response.json()
      alert(result.message || 'Task completed successfully!')
      
      setSelectedTask(null)
      setCompletionNotes('')
      await fetchTasks()
    } catch (error: any) {
      console.error('Error completing task:', error)
      alert(error.message || 'Failed to complete task')
    } finally {
      setActionLoading(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-300'
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'Normal': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'Low': return 'bg-gray-100 text-gray-700 border-gray-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-600'
      case 'InProgress': return 'text-blue-600'
      case 'Pending': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const pendingCount = tasks.filter(t => t.status === 'Pending').length
  const inProgressCount = tasks.filter(t => t.status === 'InProgress').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <StaffNavbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wrench className="w-8 h-8 text-amber-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">My Assigned Tasks</h1>
                <p className="text-slate-400 mt-1">Maintenance tasks assigned to you</p>
              </div>
            </div>
            <div className="flex gap-3">
              {pendingCount > 0 && (
                <div className="bg-yellow-500 text-white px-4 py-2 rounded-full font-semibold">
                  {pendingCount} Pending
                </div>
              )}
              {inProgressCount > 0 && (
                <div className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold">
                  {inProgressCount} In Progress
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'pending', label: 'Pending', icon: Clock },
              { value: 'in-progress', label: 'In Progress', icon: Play },
              { value: 'completed', label: 'Completed', icon: CheckCircle },
              { value: 'all', label: 'All', icon: Filter }
            ].map((btn) => {
              const Icon = btn.icon
              return (
                <Button
                  key={btn.value}
                  onClick={() => setFilter(btn.value as any)}
                  variant={filter === btn.value ? 'default' : 'outline'}
                  className={
                    filter === btn.value
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  }
                  size="sm"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {btn.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          </div>
        )}

        {/* Tasks List */}
        {!loading && (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No maintenance tasks found</p>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Task info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <Wrench className="w-6 h-6 text-amber-400 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-white">
                                {task.log_reference}
                              </h3>
                              <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                            </div>
                            <p className="text-slate-300 mb-3">{task.issue_description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="text-slate-400">
                                Room: <span className="text-slate-200">{task.room_type} - Room {task.room_number}</span>
                              </div>
                              <div className="text-slate-400">
                                Branch: <span className="text-slate-200">{task.branch_name}</span>
                              </div>
                              <div className="text-slate-400">
                                Assigned: <span className="text-slate-200">{new Date(task.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                            {task.notes && (
                              <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                                <p className="text-sm text-slate-300">
                                  <span className="font-semibold text-white">Notes:</span> {task.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex flex-col gap-2 min-w-[150px]">
                        {task.status === 'Pending' && (
                          <Button
                            onClick={() => handleStartTask(task.id)}
                            className="bg-blue-600 hover:bg-blue-700 w-full"
                            size="sm"
                            disabled={actionLoading === task.id}
                          >
                            {actionLoading === task.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Start Task
                              </>
                            )}
                          </Button>
                        )}
                        
                        {task.status === 'InProgress' && (
                          <Button
                            onClick={() => setSelectedTask(task)}
                            className="bg-green-600 hover:bg-green-700 w-full"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete
                          </Button>
                        )}

                        {task.status === 'Completed' && (
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Done</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Complete Task Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-white">Complete Task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-slate-300 mb-1">Task: <span className="font-semibold text-white">{selectedTask.log_reference}</span></p>
                  <p className="text-sm text-slate-400">{selectedTask.issue_description}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Completion Notes <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none"
                    placeholder="Describe what was done to resolve this issue..."
                    required
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Explain the work completed and any follow-up needed
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleCompleteTask(selectedTask.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!completionNotes.trim() || actionLoading === selectedTask.id}
                  >
                    {actionLoading === selectedTask.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedTask(null)
                      setCompletionNotes('')
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    disabled={actionLoading === selectedTask.id}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
