"use client"

import { useParams } from "next/navigation";
import EditorPage from "@/pages/EditorPage";

export default function Page() {
    const params = useParams();
    const videoId = params?.id as string;

    return <EditorPage videoId={videoId} />;
}