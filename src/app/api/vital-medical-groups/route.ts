import { medicalGroupQueries } from "@/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {

    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
        const search = searchParams.get("search")?.toLowerCase() || "";
        let all = await medicalGroupQueries.findAllVital();
        if (search) {
            all = all.filter((g: any) =>
            (g.vitalGroupName && g.vitalGroupName.toLowerCase().includes(search) ||
                (g.groupCode && g.groupCode.toLowerCase().includes(search))
            ));
        }
        const total = all.length;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const data = all.slice(start, end);
        return NextResponse.json({ data, page, pageSize, total }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
