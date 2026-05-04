
export type ImageWithLabelItem = Record<string, {
    image?: string;
    width?: number;
    height?: number;
    icon?: string;
    text?: string;
    variant?: string;
    style?: React.CSSProperties;
}>;

export function getImageWithLabelImage(item: ImageWithLabelItem): {
    id: string;
    image?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
} {
    const imageEntry = Object.entries(item).find(([eid]) => eid.startsWith('imageasset-'));

    if (!imageEntry) {
        return {
            id: 'imageasset',
        };
    }

    const [id, patch] = imageEntry;

    return {
        id,
        image: patch.image,
        width: patch.width,
        height: patch.height,
        style: patch.style,
    };
}

export type ImageStackItem = ImageWithLabelItem;
