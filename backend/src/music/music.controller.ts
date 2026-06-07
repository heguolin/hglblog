import { Controller, Get, Query } from "@nestjs/common";
import { MusicService } from "./music.service";

@Controller("music")
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get("playlist")
  getPlaylist(@Query("id") id: string) {
    return this.musicService.getPlaylist(id || "3778678");
  }

  @Get("url")
  getUrl(@Query("id") id: string) {
    return this.musicService.getSongUrl(id);
  }
}
