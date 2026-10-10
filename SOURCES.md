# Content sources and licences

Chatterjar. Copyright (c) 2026 Gayanuka Amarasuriya. The code is licensed under the MIT
License (see `LICENSE`).

The MIT License covers the code only. The software, fonts, media and data below keep their
own licences. Credit them when you show them.

## Third-party software and fonts

- Next.js, React, @upstash/redis: MIT License.
- lucide-react icons: ISC License.
- Bricolage Grotesque and Figtree fonts (through next/font/google): SIL Open Font
  License 1.1.

## Spot the AI pack (`data/packs/spot-the-ai.json`)

The media in `public/spot/assets` is under CC0, CC BY 3.0, CC BY-SA 4.0 and CC BY-NC 4.0,
credited per file below. The MIT License does not cover these files.

| Poll            | Files                                                                  | Source                                                                                                                                                                                                                                                      | Licence                                                                                  |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cat photo       | `public/spot/assets/spot_image1_A.jpg` (human)                         | ["Sleepy European tabby cat"](https://commons.wikimedia.org/wiki/File:Sleepy_European_tabby_cat.jpg) by Gugalcrom123, Wikimedia Commons                                                                                                                     | [CC0](https://creativecommons.org/publicdomain/zero/1.0/)                                |
| Cat photo       | `public/spot/assets/spot_image1_B.jpg` (AI)                            | [DiffusionDB](https://huggingface.co/datasets/poloclub/diffusiondb) (Wang et al., 2022), Stable Diffusion, `part-000004`, image `ab5be85c-8490-4379-8273-2574bd24cc53`, prompt "a cat sleeping on a desk, studio photography, 8 k"                          | [CC0](https://creativecommons.org/publicdomain/zero/1.0/)                                |
| Pasta photo     | `public/spot/assets/spot_image2_A.jpg` (AI)                            | [DiffusionDB](https://huggingface.co/datasets/poloclub/diffusiondb), Stable Diffusion, `part-000008`, image `ce601abe-55ca-41b4-8253-768bd21b73fa`, prompt "a pasta bolognese bowl on a wooden table..."                                                    | [CC0](https://creativecommons.org/publicdomain/zero/1.0/)                                |
| Pasta photo     | `public/spot/assets/spot_image2_B.jpg` (human)                         | ["Tallarines boloñesa pastafresca tagliatelle bolognese"](https://commons.wikimedia.org/wiki/File:Tallarines_boloñesa_pastafresca_tagliatelle_bolognese.jpg) by Tirithel, Wikimedia Commons, cropped and resized                                            | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)                          |
| Network text    | `public/spot/assets/spot_text1_A.txt` (human), `spot_text1_B.txt` (AI) | [HC3](https://huggingface.co/datasets/Hello-SimpleAI/HC3) (Guo et al., 2023), subset `wiki_csai`, "Computer network": the Wikipedia answer (Wikipedia contributors) and the first ChatGPT answer, each trimmed to one paragraph                             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)                          |
| Essay paragraph | `public/spot/assets/round3_essay_A.txt`, `round3_essay_B.txt`          | Ghostbuster (Verma et al., NAACL 2024), [ghostbuster-data](https://github.com/vivek3141/ghostbuster-data), `essay/human/2.txt` and `essay/gpt/2.txt`, first paragraph of each                                                                               | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)                                |
| Music           | `public/spot/assets/round5_music_A.mp3`, `round5_music_B.mp3`          | Deezer Research, "AI-Generated Music Detection and its Challenges" (Afchar et al., ICASSP 2025), [deepfake-detector](https://github.com/deezer/deepfake-detector), `audio_examples/musika/000002.mp3` (AI) and `audio_examples/real/000002.mp3` (FMA track) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), non-commercial use only |

### Changes made to the originals

- Photos: cropped to the same 4:3 frame and resized to 768 x 576 so framing and size do not
  give the answer away; metadata removed. The AI images were upscaled from 832 x 512.
- Network text: the first paragraph plus the first sentence of the second, joined into one
  paragraph; no words changed.
- Essays: the first paragraph of each essay, unchanged.
- Music: seconds 4 to 24 of each 30-second clip, loudness-normalised to -16 LUFS with a
  0.5 s fade-in and a 1 s fade-out, so volume does not give the answer away.

The AI music sample is the same FMA track rebuilt by Musika, a neural music model. It is
AI-generated audio that follows the original song, not a new song from a text prompt.

## Other packs

`data/packs/demo.json` is original content under the MIT License, like the code.

## Rounds removed from the public repo

Earlier Spot-the-AI rounds (images from ArtiFact and Chameleon, Java code from GPTSniffer)
were removed because their licences do not allow redistribution here.
