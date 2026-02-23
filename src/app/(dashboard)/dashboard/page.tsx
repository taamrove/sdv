import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import {
  Package,
  Shirt,
  MapPin,
  Wrench,
  ShoppingBag,
  CheckCircle,
  FolderOpen,
  Users,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let totalPieces = 0,
    availablePieces = 0,
    assignedPieces = 0,
    maintenancePieces = 0,
    totalItems = 0,
    totalLocations = 0,
    activeProjects = 0,
    totalPerformers = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentActivity: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upcomingProjects: any[] = [];

  try {
    // Batch all queries into a single transaction to use ONE connection
    const [
      _totalPieces,
      _availablePieces,
      _assignedPieces,
      _maintenancePieces,
      _totalItems,
      _totalLocations,
      _activeProjects,
      _totalPerformers,
      _recentActivity,
      _upcomingProjects,
    ] = await prisma.$transaction([
      prisma.piece.count(),
      prisma.piece.count({ where: { status: "AVAILABLE" } }),
      prisma.piece.count({ where: { status: "ASSIGNED" } }),
      prisma.piece.count({ where: { status: "MAINTENANCE" } }),
      prisma.item.count(),
      prisma.warehouseLocation.count(),
      prisma.project.count({
        where: { status: { in: ["CONFIRMED", "PACKING", "IN_TRANSIT", "ACTIVE"] } },
      }),
      prisma.performer.count({ where: { active: true } }),
      prisma.pieceHistory.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          piece: { select: { humanReadableId: true, id: true } },
          performedBy: { select: { name: true } },
        },
      }),
      prisma.project.findMany({
        where: {
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          startDate: { gte: new Date() },
        },
        orderBy: { startDate: "asc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          _count: { select: { assignments: true, bookings: true } },
        },
      }),
    ]);

    totalPieces = _totalPieces;
    availablePieces = _availablePieces;
    assignedPieces = _assignedPieces;
    maintenancePieces = _maintenancePieces;
    totalItems = _totalItems;
    totalLocations = _totalLocations;
    activeProjects = _activeProjects;
    totalPerformers = _totalPerformers;
    recentActivity = _recentActivity;
    upcomingProjects = _upcomingProjects;
  } catch (error) {
    console.error("Dashboard query error:", error);
  }

  const stats = [
    {
      title: "Total Pieces",
      value: totalPieces,
      icon: Package,
      description: "All pieces in system",
    },
    {
      title: "Available",
      value: availablePieces,
      icon: CheckCircle,
      description: "Ready for assignment",
    },
    {
      title: "Assigned",
      value: assignedPieces,
      icon: Shirt,
      description: "Assigned to projects",
    },
    {
      title: "In Maintenance",
      value: maintenancePieces,
      icon: Wrench,
      description: "Being repaired",
    },
    {
      title: "Active Projects",
      value: activeProjects,
      icon: FolderOpen,
      description: "Currently running",
    },
    {
      title: "Performers",
      value: totalPerformers,
      icon: Users,
      description: "Active performers",
    },
    {
      title: "Items",
      value: totalItems,
      icon: ShoppingBag,
      description: "Unique item types",
    },
    {
      title: "Locations",
      value: totalLocations,
      icon: MapPin,
      description: "Warehouse locations",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Upcoming Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming projects.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString()
                          : "No date"}{" "}
                        {project.endDate &&
                          `- ${new Date(project.endDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {project._count.assignments} performers
                      </Badge>
                      <StatusBadge status={project.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0"
                  >
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={entry.action} />
                        <Link
                          href={`/inventory/${entry.piece.id}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {entry.piece.humanReadableId}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                        {entry.performedBy && (
                          <span>by {entry.performedBy.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
