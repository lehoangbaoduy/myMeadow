import { prisma } from "@/lib/prisma";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";

export interface RoomImageRow {
  id: number;
  order: number;
}

export interface RoomRow {
  id: number;
  roomNumber: string;
  notes: string | null;
  images: RoomImageRow[];
  assignedTenants: { id: number; name: string }[];
}

export interface AssignableTenant {
  id: number;
  name: string;
  roomNumber: string | null;
  isPlaceholder: boolean;
}

export interface RoomsAdminData {
  rooms: RoomRow[];
  tenants: AssignableTenant[];
}

export async function getRoomsAdminData(): Promise<RoomsAdminData> {
  const [rooms, tenantRows] = await Promise.all([
    prisma.room.findMany({
      orderBy: { roomNumber: "asc" },
      include: { images: { select: { id: true, order: true }, orderBy: { order: "asc" } } },
    }),
    prisma.tenant.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, roomNumber: true, user: { select: { clerkId: true } } },
    }),
  ]);

  const tenants = tenantRows.map(({ user, ...t }) => ({ ...t, isPlaceholder: isPlaceholderClerkId(user.clerkId) }));

  const roomRows: RoomRow[] = rooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    notes: r.notes,
    images: r.images,
    assignedTenants: tenants.filter((t) => t.roomNumber === r.roomNumber).map((t) => ({ id: t.id, name: t.name })),
  }));

  return { rooms: roomRows, tenants };
}
