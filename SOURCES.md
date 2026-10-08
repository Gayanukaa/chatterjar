# Content sources and licences

The MIT License in `LICENSE` covers the code only. The media and data below keep their own
licences. Credit them when you show them.

## Spot the AI pack (`data/packs/spot-the-ai.json`)

| Poll            | Files                                                         | Source                                                                                                                                                                                                                                                      | Licence                                                                                  |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Essay paragraph | `public/spot/assets/round3_essay_A.txt`, `round3_essay_B.txt` | Ghostbuster (Verma et al., NAACL 2024), [ghostbuster-data](https://github.com/vivek3141/ghostbuster-data), `essay/human/2.txt` and `essay/gpt/2.txt`, first paragraph of each                                                                               | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)                                |
| Music           | `public/spot/assets/round5_music_A.mp3`, `round5_music_B.mp3` | Deezer Research, "AI-Generated Music Detection and its Challenges" (Afchar et al., ICASSP 2025), [deepfake-detector](https://github.com/deezer/deepfake-detector), `audio_examples/musika/000002.mp3` (AI) and `audio_examples/real/000002.mp3` (FMA track) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), non-commercial use only |

### Changes made to the originals

- Essays: the first paragraph of each essay, unchanged.
- Music: seconds 4 to 24 of each 30-second clip, loudness-normalised to -16 LUFS with a
  0.5 s fade-in and a 1 s fade-out, so volume does not give the answer away.

The AI music sample is the same FMA track rebuilt by Musika, a neural music model. It is
AI-generated audio that follows the original song, not a new song from a text prompt.

## Other packs

`data/packs/demo.json` and `data/packs/claude-code-talk.json` are original content under the
MIT License, like the code.

## Rounds removed from the public repo

Earlier Spot-the-AI rounds (images from ArtiFact and Chameleon, Java code from GPTSniffer)
were removed because their licences do not allow redistribution here.
