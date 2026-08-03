import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUpsertAnnouncement,
  adminUpsertGalleryFeature,
  listAdminAnnouncements,
  listAdminGallery,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/content")({
  component: AdminContent,
});

function AdminContent() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const fetchAnnouncements = useServerFn(listAdminAnnouncements);
  const fetchGallery = useServerFn(listAdminGallery);
  const upsertAnnouncement = useServerFn(adminUpsertAnnouncement);
  const upsertGallery = useServerFn(adminUpsertGalleryFeature);

  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => fetchAnnouncements(),
  });
  const { data: gallery } = useQuery({ queryKey: ["admin-gallery"], queryFn: () => fetchGallery() });

  const announcementMutation = useMutation({
    mutationFn: (vars: { id: string | null; title: string; body: string; published: boolean }) =>
      upsertAnnouncement({ data: vars }),
    onSuccess: () => {
      toast.success("Announcement saved");
      setTitle("");
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const galleryMutation = useMutation({
    mutationFn: (vars: {
      id: string | null;
      displayName: string;
      rankKey: string | null;
      caption: string | null;
      photoUrl: string;
      visible: boolean;
    }) => upsertGallery({ data: vars }),
    onSuccess: () => {
      toast.success("Gallery entry saved");
      setName("");
      setCaption("");
      setPhotoUrl("");
      void queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PanelCard title="Announcements" description="Published news appears on member dashboards.">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            announcementMutation.mutate({ id: null, title, body, published: true });
          }}
        >
          <Input
            placeholder="Headline"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={140}
            required
          />
          <Textarea
            placeholder="Announcement body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" variant="prime">
              Publish
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => announcementMutation.mutate({ id: null, title, body, published: false })}
            >
              Save as draft
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {announcements?.map((row) => (
            <div key={row.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.body}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    announcementMutation.mutate({
                      id: row.id,
                      title: row.title,
                      body: row.body,
                      published: !row.published,
                    })
                  }
                >
                  {row.published ? "Unpublish" : "Publish"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Qualified member gallery" description="Feature member photos on the site.">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            galleryMutation.mutate({
              id: null,
              displayName: name,
              rankKey: null,
              caption: caption || null,
              photoUrl,
              visible: true,
            });
          }}
        >
          <Input
            placeholder="Member name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            placeholder="Photo URL"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            required
          />
          <Input
            className="sm:col-span-2"
            placeholder="Caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={300}
          />
          <Button type="submit" variant="prime" className="sm:col-span-2 sm:w-fit">
            Add to gallery
          </Button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gallery?.map((row) => (
            <div key={row.id} className="rounded-xl border border-border bg-card p-4">
              <img
                src={row.photo_url}
                alt={`KM Prime member ${row.display_name}`}
                className="h-40 w-full rounded-lg object-cover"
                loading="lazy"
              />
              <p className="mt-3 font-semibold">{row.display_name}</p>
              <p className="text-xs text-muted-foreground">{row.caption}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() =>
                  galleryMutation.mutate({
                    id: row.id,
                    displayName: row.display_name,
                    rankKey: row.rank_key,
                    caption: row.caption,
                    photoUrl: row.photo_url,
                    visible: !row.visible,
                  })
                }
              >
                {row.visible ? "Hide" : "Show"}
              </Button>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
