import { medicalGroupQueries } from "@/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
        const search = searchParams.get("search")?.toLowerCase() || "";
        let all = await medicalGroupQueries.findAllMmm();
        if (search) {
            all = all.filter((g: any) =>
                g.name.toLowerCase().includes(search) ||
                (g.medicalGroup && g.medicalGroup.toLowerCase().includes(search))
            );
        }

        const total = all.length;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const data = all.slice(start, end);
        return NextResponse.json({ data, page, pageSize, total }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Add route
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, medicalGroup } = body;

        if (!name || !medicalGroup) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const newGroup = await medicalGroupQueries.createMmm({ name, medicalGroup });

        return NextResponse.json(newGroup, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add medical group' }, { status: 500 });
    }
}

// Update route
export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Missing entry id" },
                { status: 400 }
            );
        }
        const { name, medicalGroup } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const updatedGroup = await medicalGroupQueries.updateMmm(parseInt(id), { name, medicalGroup });

        if (!updatedGroup) {
            return NextResponse.json({ error: 'Medical group not found' }, { status: 404 });
        }

        return NextResponse.json(updatedGroup, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update medical group' }, { status: 500 });
    }
}

// Delete route
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Missing entry id" },
                { status: 400 }
            );
        }

        const deleted = await medicalGroupQueries.deleteMmm(parseInt(id));

        if (!deleted) {
            return NextResponse.json({ error: 'Medical group not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Medical group deleted successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete medical group' }, { status: 500 });
    }
}
