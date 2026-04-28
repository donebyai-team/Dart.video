import type { PillPatchGroup } from '../../../../core/assets/IconTextPill';

export type ImageWithLabelItem = Record<string, {
    image?: string;
    width?: number;
    height?: number;
    icon?: string;
    text?: string;
    variant?: string;
    style?: React.CSSProperties;
}>;

export function getImageWithLabelPill(item: ImageWithLabelItem): PillPatchGroup {
    return Object.fromEntries(
        Object.entries(item).filter(([eid]) =>
            eid.startsWith('iconasset-') ||
            eid.startsWith('text-') ||
            eid.startsWith('textasset-') ||
            eid.startsWith('container-'),
        ),
    );
}

export function getImageWithLabelImage(item: ImageWithLabelItem): {
    id: string;
    image?: string;
    width?: number;
    height?: number;
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
    };
}

export type ImageStackItem = ImageWithLabelItem;
