import { medicalGroupQueries } from "@/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    try {
        const allGroups = await medicalGroupQueries.findAllVital();
        const filtered = search
            ? allGroups.filter((g: any) =>
                (g.vitalGroupName && g.vitalGroupName.toLowerCase().includes(search.toLowerCase())) ||
                (g.groupCode && g.groupCode.toLowerCase().includes(search.toLowerCase()))
            )
            : allGroups;
        return NextResponse.json({ data: filtered }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
