/** Live interviews run only in their booked slot: from the start time to the end, not before or after.
    Shared by the server (which refuses the call outside it) and the pages (which say when it opens). */
export const slotState = (at: number, minutes: number, now = Date.now()): "early" | "over" | "" => (now < at ? "early" : now > at + minutes * 60_000 ? "over" : "");
