import { PLANS } from "@/lib/constants";

export function getPlanColors(): Record<string, string> {
    return PLANS.reduce((acc: Record<string, string>, plan) => {
        acc[plan.name] = plan.color;
        return acc;
    }, {});
}