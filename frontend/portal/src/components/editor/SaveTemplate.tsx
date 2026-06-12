"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import { useClientsContext } from "@coasterai/ui-core/context/ClientContext"
import { getConnectError } from "@/utils/error"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const TEMPLATE_CATEGORIES = [
  "HOOK",
  "PROBLEM",
  "SOLUTION",
  "REVEAL",
  "CTA",
  "INTRO",
  "OUTRO",
  "SOCIAL_PROOF",
]

type SaveTemplateProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
}

type FormState = {
  name: string
  description: string
  usageDescription: string
  categories: string[]
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  usageDescription: "",
  categories: [],
}

const splitDescriptionAndUsage = (value?: string) => {
  const content = value?.trim() ?? ""

  if (!content) {
    return { description: "", usageDescription: "" }
  }

  const separator = "\n\n"
  const separatorIndex = content.indexOf(separator)

  if (separatorIndex === -1) {
    return { description: content, usageDescription: "" }
  }

  return {
    description: content.slice(0, separatorIndex).trim(),
    usageDescription: content.slice(separatorIndex + separator.length).trim(),
  }
}

const SaveTemplate = ({ open, onOpenChange, videoId }: SaveTemplateProps) => {
  const { portalClient } = useClientsContext()
  const templateId = useMemo(() => {
    const decodedVideoId = decodeURIComponent(videoId)
    return decodedVideoId.replace(/^template:/, "")
  }, [videoId])

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !portalClient || !templateId) {
      return
    }

    const loadTemplate = async () => {
      try {
        setIsLoading(true)
        const template = await portalClient.getTemplate({ id: templateId })
        const { description, usageDescription } = splitDescriptionAndUsage(template.description)

        setForm({
          name: template.name ?? "",
          description,
          usageDescription,
          categories: template.categories ?? [],
        })
      } catch (error) {
        console.error("Failed to load template", error)
        toast.error(getConnectError(error))
        onOpenChange(false)
      } finally {
        setIsLoading(false)
      }
    }

    void loadTemplate()
  }, [open, portalClient, templateId, onOpenChange])

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setIsLoading(false)
      setIsSaving(false)
    }
  }, [open])

  const updateField = <K extends keyof FormState,>(key: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const toggleCategory = (category: string, checked: boolean) => {
    setForm(current => ({
      ...current,
      categories: checked
        ? Array.from(new Set([...current.categories, category]))
        : current.categories.filter(value => value !== category),
    }))
  }

  const isValid = Boolean(
    form.name.trim() &&
    form.description.trim() &&
    form.categories.length > 0
  )

  const handleSave = async () => {
    if (!portalClient) return

    if (!isValid) {
      toast.error("All fields are mandatory")
      return
    }

    try {
      setIsSaving(true)
      await portalClient.saveTemplate({
        id: templateId,
        name: form.name.trim(),
        description: form.description.trim(),
        usageDescription: form.usageDescription.trim(),
        categories: form.categories,
      })

      toast.success("Template saved")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save template", error)
      toast.error(getConnectError(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Save Template</DialogTitle>
          <DialogDescription>
            Fill in the template details before saving it to the library.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name(Max 10 characters)</Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={event => updateField("name", event.target.value)}
                placeholder="Enter template name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description(Max 2 lines)</Label>
              <Textarea
                id="template-description"
                value={form.description}
                onChange={event => updateField("description", event.target.value)}
                placeholder="Describe what this template does"
                rows={2}
                className="min-h-[3.5rem] resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-usage">Usage Instructions(optional)</Label>
              <Textarea
                id="template-usage"
                value={form.usageDescription}
                onChange={event => updateField("usageDescription", event.target.value)}
                placeholder="(Optional)Explain how and when to use this template"
                rows={2}
                className="min-h-[3.5rem] resize-none text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATE_CATEGORIES.map(category => {
                  const checked = form.categories.includes(category)

                  return (
                    <label
                      key={category}
                      className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={value => toggleCategory(category, value === true)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="leading-none">{category}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isLoading || isSaving || !isValid}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SaveTemplate
