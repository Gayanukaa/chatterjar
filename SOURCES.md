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

The repo ships no media. Each round links to the original file at its source, so the
files keep their own licences and the MIT License does not cover them. Credit them when
you show them; the pack's `source` line does this after each reveal.

| Poll      | Side  | Link                                                                                                                                       | Credit and licence                                                                                                                                                                   |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Apple     | Human | [Granny Smith Apple 02](https://commons.wikimedia.org/wiki/File:Granny_Smith_Apple_02.JPG)                                                 | Jorcoga, Wikimedia Commons, public domain                                                                                                                                            |
| Apple     | AI    | [Green apple gen](https://commons.wikimedia.org/wiki/File:Green_apple_gen.png)                                                             | Midjourney v6, prompted by The masketta man ("green granny smith apple on a brown tablecloth, hasselblad still life photograph"), public domain                                      |
| Essay     | Human | [`essay/human/2.txt`](https://github.com/vivek3141/ghostbuster-data/blob/master/essay/human/2.txt)                                         | Ghostbuster (Verma et al., NAACL 2024), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)                                                                                    |
| Essay     | AI    | [`essay/gpt/2.txt`](https://github.com/vivek3141/ghostbuster-data/blob/master/essay/gpt/2.txt)                                             | Ghostbuster (Verma et al., NAACL 2024), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)                                                                                    |
| Mountains | AI    | [Adobe Firefly generated landscape photography](https://commons.wikimedia.org/wiki/File:Adobe_Firefly_generated_landscape_photography.jpg) | Adobe Firefly Image 3, prompted by Jiri Vedral, public domain                                                                                                                        |
| Mountains | Human | [Mountains in Afghanistan](https://commons.wikimedia.org/wiki/File:Mountains_in_Afghanistan.JPG)                                           | Master Sgt. Andy Dunaway, U.S. Air Force, public domain                                                                                                                              |
| Music     | AI    | [`audio_examples/musika/000002.mp3`](https://github.com/deezer/deepfake-detector/blob/main/audio_examples/musika/000002.mp3)               | Deezer Research, "AI-Generated Music Detection and its Challenges" (Afchar et al., ICASSP 2025), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), non-commercial use |
| Music     | Human | [`audio_examples/real/000002.mp3`](https://github.com/deezer/deepfake-detector/blob/main/audio_examples/real/000002.mp3) (an FMA track)    | Same source and licence                                                                                                                                                              |

Notes:

- Images load through Next.js image optimization from `upload.wikimedia.org`; essays and
  music load from `raw.githubusercontent.com`. Only these two hosts are allowed for links.
- The files are the unedited originals: the essays differ in length and the music clips in
  loudness, which can hint at the answer.
- Links can break if a source renames or deletes a file. Check the pack before an event.
- The AI music is the same FMA track rebuilt by Musika, a neural music model.

## Other packs

`data/packs/demo.json` is original content under the MIT License, like the code.
