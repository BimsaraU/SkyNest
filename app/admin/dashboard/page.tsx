'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign, PieChart, Briefcase, Users, BarChart2, BadgeInfo, Settings, AlertTriangle, Bell, Wrench, ConciergeBell, Calendar, CreditCard} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select'


// Type definitions for our dashboard data
type OverallStats = {
  totalRevenue: number;
  occupancyRate: number;
  totalBookings: number;
  activeStaff: number;
};

type BranchStat = {
  id: string;
  name: string;
  occupancy: number;
  revenue: number;
};

type Activity = {
  id: number;
  description: string;
  time: string;
};

type Admin = {
  name: string;
  role: string;
};

type Approval = {
  id: number;
  type: string;
  description: string;
  branch: string;
};

type DashboardData = {
  overallStats: OverallStats;
  branchStats: BranchStat[];
  recentActivities: Activity[];
  admin: Admin;
  pendingApprovals: Approval[]; // Approvals are now part of fetched data
};

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);

interface DashboardAlert {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  requires_action: boolean;
  created_at: string;
}

interface MaintenanceRequest {
  id: number;
  log_reference: string;
  issue_description: string;
  priority: string;
  room_number: string;
  room_type: string;
  branch_name: string;
  reported_by_name?: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [alertCounts, setAlertCounts] = useState({ action_required: 0, urgent: 0 });
  const [pendingMaintenance, setPendingMaintenance] = useState<MaintenanceRequest[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    fetchAlerts();
    fetchPendingMaintenance();
    fetchStaff();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/alerts?filter=urgent');
      if (response.ok) {
        const result = await response.json();
        setAlerts((result.alerts || []).slice(0, 5)); // Top 5 urgent alerts
        setAlertCounts({
          action_required: result.action_required_count || 0,
          urgent: result.urgent_count || 0
        });
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Alerts API error:', errorData);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const fetchPendingMaintenance = async () => {
    try {
      const response = await fetch('/api/admin/maintenance?filter=pending');
      if (response.ok) {
        const result = await response.json();
        setPendingMaintenance((result.requests || []).slice(0, 5)); // Top 5 pending
      }
    } catch (err) {
      console.error('Error fetching maintenance:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/staff');
      if (response.ok) {
        const result = await response.json();
        setStaffMembers(result.staff || []);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleApproveMaintenance = async (requestId: number, assignedStaffId?: number) => {
    try {
      const response = await fetch(`/api/admin/maintenance/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_staff_id: assignedStaffId })
      });

      if (response.ok) {
        await fetchPendingMaintenance();
        await fetchAlerts();
      }
    } catch (err) {
      console.error('Error approving maintenance:', err);
      alert('Failed to approve maintenance request');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto text-gray-300 p-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="mb-8 flex justify-between items-center">
          <div className="space-y-3">
            <div className="h-8 bg-gray-700 rounded w-64"></div>
            <div className="h-4 bg-gray-700 rounded w-96"></div>
          </div>
          <div className="text-right space-y-2">
            <div className="h-6 bg-gray-700 rounded w-32 ml-auto"></div>
            <div className="h-4 bg-gray-700 rounded w-24 ml-auto"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-700 rounded w-24"></div>
                <div className="h-8 bg-gray-700 rounded w-32"></div>
                <div className="h-3 bg-gray-700 rounded w-20"></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Lower Section Skeleton */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-700 rounded"></div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-700 rounded"></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500 bg-[#10141c]">Error: {error}</div>;
  }
  
  if (!data) {
    return <div className="flex h-screen items-center justify-center text-white bg-[#10141c]">Could not load dashboard data.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto text-gray-300 p-4">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
          <p className="text-gray-400">Here's a snapshot of your hotel operations today.</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-white text-lg">{data.admin.name}</p>
          <p className="text-sm text-gray-500">{data.admin.role}</p>
        </div>
      </header>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-gray-400">Total Revenue</p><p className="text-2xl font-bold text-white">${data.overallStats.totalRevenue.toLocaleString()}</p></div>
            <div className="bg-green-500/10 p-3 rounded-lg"><DollarSign className="text-green-400" size={24}/></div>
          </div>
        </Card>
        <Card>
          <div className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-gray-400">Occupancy Rate</p><p className="text-2xl font-bold text-white">{data.overallStats.occupancyRate}%</p></div>
            <div className="bg-blue-500/10 p-3 rounded-lg"><PieChart className="text-blue-400" size={24}/></div>
          </div>
        </Card>
        <Card>
          <div className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-gray-400">Total Bookings</p><p className="text-2xl font-bold text-white">{data.overallStats.totalBookings}</p></div>
            <div className="bg-purple-500/10 p-3 rounded-lg"><Briefcase className="text-purple-400" size={24}/></div>
          </div>
        </Card>
        <Card>
          <div className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-gray-400">Active Staff</p><p className="text-2xl font-bold text-white">{data.overallStats.activeStaff}</p></div>
            <div className="bg-amber-400/10 p-3 rounded-lg"><Users className="text-amber-400" size={24}/></div>
          </div>
        </Card>
      </div>

      {/* Pending Maintenance Approvals */}
      {pendingMaintenance.length > 0 && (
        <Card className="mb-8 border-red-500/30">
          <div className="p-6 flex justify-between items-center border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Wrench className="text-red-400" size={20}/>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pending Maintenance Approvals</h2>
                <p className="text-sm text-gray-400">Staff-submitted requests awaiting your approval</p>
              </div>
            </div>
            <Link href="/admin/maintenance" className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors">
              View All
              <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {pendingMaintenance.length}
              </span>
            </Link>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {pendingMaintenance.map((request) => {
                const getPriorityColor = (priority: string) => {
                  switch (priority) {
                    case 'Urgent': return 'bg-red-100 text-red-700 border-red-300';
                    case 'High': return 'bg-orange-100 text-orange-700 border-orange-300';
                    case 'Normal': return 'bg-blue-100 text-blue-700 border-blue-300';
                    case 'Low': return 'bg-gray-100 text-gray-700 border-gray-300';
                    default: return 'bg-gray-100 text-gray-700 border-gray-300';
                  }
                };

                return (
                  <div key={request.id} className="bg-[#10141c] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                          <Wrench className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-white">{request.log_reference}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mb-2 line-clamp-2">{request.issue_description}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span>Room: {request.room_number} ({request.room_type})</span>
                            <span>Branch: {request.branch_name}</span>
                            {request.reported_by_name && <span>By: {request.reported_by_name}</span>}
                            <span>{new Date(request.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Select
                          onValueChange={(value) => {
                            if (value) {
                              handleApproveMaintenance(request.id, parseInt(value));
                            }
                          }}
                        >
                          <SelectTrigger className="px-3 py-2 bg-transparent border-2 border-amber-400/50 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.5)] text-amber-400 hover:text-amber-300 rounded-lg text-sm font-semibold transition-all duration-300">
                            <SelectValue placeholder="✓ Approve & Assign Staff" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#181d28] border-gray-700">
                            <SelectItem value="0" className="text-gray-300 hover:bg-gray-700 hover:text-white">Approve (No Assignment Yet)</SelectItem>
                            
                            {/* Group by position/department */}
                            {(() => {
                              // Group staff by position
                              const grouped = staffMembers.reduce((acc: any, staff: any) => {
                                const position = staff.role || staff.position || 'Other Staff';
                                if (!acc[position]) acc[position] = [];
                                acc[position].push(staff);
                                return acc;
                              }, {});

                              // Sort positions - Maintenance first
                              const positionOrder = ['Maintenance Staff', 'Housekeeping', 'Front Desk', 'Manager', 'Other Staff'];
                              const sortedPositions = Object.keys(grouped).sort((a, b) => {
                                const aIndex = positionOrder.findIndex(p => a.toLowerCase().includes(p.toLowerCase()));
                                const bIndex = positionOrder.findIndex(p => b.toLowerCase().includes(p.toLowerCase()));
                                if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                                if (aIndex === -1) return 1;
                                if (bIndex === -1) return -1;
                                return aIndex - bIndex;
                              });

                              return sortedPositions.map(position => (
                                <SelectGroup key={position}>
                                  <SelectLabel className="text-gray-400 text-xs">{position}</SelectLabel>
                                  {grouped[position]
                                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                                    .map((staff: any) => (
                                      <SelectItem key={staff.id} value={staff.id.toString()} className="text-gray-300 hover:bg-gray-700 hover:text-white">
                                        {staff.name} {staff.department ? `- ${staff.department}` : ''}
                                      </SelectItem>
                                    ))}
                                </SelectGroup>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        <Link 
                          href="/admin/maintenance"
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold text-center transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Branch Overview */}
          <Card>
            <div className="p-6 flex justify-between items-center border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Branch Overview</h2>
              {/* Branch filter logic can be implemented here */}
            </div>
            <div className="p-6 grid md:grid-cols-3 gap-6">
              {data.branchStats.map(branch => {
                const revenuePercentage = data.overallStats.totalRevenue > 0 
                  ? ((branch.revenue / data.overallStats.totalRevenue) * 100).toFixed(1) 
                  : '0.0';
                
                return (
                  <div key={branch.id} className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <h3 className="font-semibold text-white mb-2 truncate">{branch.name}</h3>
                    <div className="mb-1">
                      <span className="text-xs text-gray-400">Branch Occupancy</span>
                      <p className="text-3xl font-bold text-white">{branch.occupancy}%</p>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{width: `${branch.occupancy}%`}}></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Revenue:</span>
                        <span className="text-emerald-400 font-semibold">
                          ${(branch.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Share:</span>
                        <span className="text-blue-400 font-semibold">
                          {revenuePercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          {/* Recent Activities */}
          <Card>
            <div className="p-6 border-b border-gray-800"><h2 className="text-xl font-bold text-white">Recent Activities</h2></div>
            <div className="p-6 space-y-3">
              {data.recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-md hover:bg-white/5">
                  <div className="flex items-center space-x-3"><Briefcase size={16} className="text-gray-400"/>
                    <p className="font-medium text-sm text-white">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-8">
          {/* Pending Approvals (Real Data from Maintenance) */}
          {data.pendingApprovals && data.pendingApprovals.length > 0 && (
            <Card>
              <div className="p-6 flex justify-between items-center border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Pending Approvals</h2>
                <Link 
                  href="/admin/maintenance"
                  className="bg-amber-400/10 text-amber-400 text-sm font-bold px-3 py-1 rounded-full hover:bg-amber-400/20 transition-colors"
                >
                  {data.pendingApprovals.length}
                </Link>
              </div>
              <div className="p-6 space-y-4">
                {data.pendingApprovals.map((approval: any) => {
                  const getPriorityColor = (priority: string) => {
                    switch (priority) {
                      case 'Urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
                      case 'High': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
                      case 'Normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                      case 'Low': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                    }
                  };

                  return (
                    <div key={approval.id} className="bg-[#10141c] p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-white">{approval.log_reference || 'Maintenance Request'}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(approval.priority)}`}>
                          {approval.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{approval.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <span>Room {approval.room_number}</span>
                        <span>•</span>
                        <span>{approval.branch}</span>
                        {approval.reported_by && (
                          <>
                            <span>•</span>
                            <span>By: {approval.reported_by}</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => {
                            if (value) {
                              handleApproveMaintenance(approval.id, parseInt(value));
                            }
                          }}
                        >
                          <SelectTrigger className="flex-1 py-2 px-3 text-xs rounded-md bg-transparent border-2 border-amber-400/50 hover:border-amber-400 hover:shadow-[0_0_12px_rgba(251,191,36,0.5)] text-amber-400 hover:text-amber-300 font-semibold transition-all duration-300">
                            <SelectValue placeholder="✓ Approve & Assign" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#181d28] border-gray-700">
                            <SelectItem value="0" className="text-gray-300 hover:bg-gray-700 hover:text-white">Approve (Unassigned)</SelectItem>
                            
                            {/* Grouped staff dropdown */}
                            {(() => {
                              const grouped = staffMembers.reduce((acc: any, staff: any) => {
                                const position = staff.role || staff.position || 'Other Staff';
                                if (!acc[position]) acc[position] = [];
                                acc[position].push(staff);
                                return acc;
                              }, {});

                              const positionOrder = ['Maintenance Staff', 'Housekeeping', 'Front Desk', 'Manager'];
                              const sortedPositions = Object.keys(grouped).sort((a, b) => {
                                const aIndex = positionOrder.findIndex(p => a.toLowerCase().includes(p.toLowerCase()));
                                const bIndex = positionOrder.findIndex(p => b.toLowerCase().includes(p.toLowerCase()));
                                if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                                if (aIndex === -1) return 1;
                                if (bIndex === -1) return -1;
                                return aIndex - bIndex;
                              });

                              return sortedPositions.map(position => (
                                <SelectGroup key={position}>
                                  <SelectLabel className="text-gray-400 text-xs">{position}</SelectLabel>
                                  {grouped[position]
                                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                                    .map((staff: any) => (
                                      <SelectItem key={staff.id} value={staff.id.toString()} className="text-gray-300 hover:bg-gray-700 hover:text-white">
                                        {staff.name}
                                      </SelectItem>
                                    ))}
                                </SelectGroup>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        <Link 
                          href="/admin/maintenance"
                          className="py-2 px-3 text-xs rounded-md bg-gray-700/50 text-gray-300 hover:bg-gray-700 font-semibold transition-colors flex items-center justify-center"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {/* Quick Actions */}
          <Card>
            <div className="p-6 border-b border-gray-800"><h2 className="text-xl font-bold text-white">Quick Actions</h2></div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <Link href="/admin/reports" className="flex flex-col items-center justify-center p-4 bg-[#10141c] rounded-lg border border-gray-800 hover:border-amber-400 hover:text-amber-400">
                <BarChart2 size={24} className="mb-2"/><span className="text-sm font-semibold">Reports</span>
              </Link>
              <Link href="/admin/alerts" className="flex flex-col items-center justify-center p-4 bg-[#10141c] rounded-lg border border-gray-800 hover:border-amber-400 hover:text-amber-400">
                <BadgeInfo size={24} className="mb-2"/><span className="text-sm font-semibold">Alerts</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

