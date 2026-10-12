# Spot the AI: sources

| Round | Type            | Source                                                                                          | Where the files came from                                                                                | Licence notes                                                                            |
| ----- | --------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1     | Essay paragraph | Ghostbuster (Verma et al., NAACL 2024)                                                          | github.com/vivek3141/ghostbuster-data, essay/human/2.txt and essay/gpt/2.txt (first paragraph of each)   | Repository licence CC BY 3.0. Human essays come from an online essay site, per the paper |
| 2     | Music           | Deezer Research, "AI-Generated Music Detection and its Challenges" (Afchar et al., ICASSP 2025) | github.com/deezer/deepfake-detector, audio_examples/real/000002.mp3 and audio_examples/musika/000002.mp3 | Repository licence CC BY-NC 4.0. The real track is from the Free Music Archive (FMA)     |

## Changes made to the originals

- Essays: the first paragraph of each essay, unchanged.
- Music: seconds 4 to 24 of each 30-second clip, loudness-normalised to -16 LUFS with 0.5 s fade-in and 1 s fade-out, so volume does not give the answer.

## Note on round 2

The AI sample is the same FMA track rebuilt by Musika, a neural music model. It is AI-generated audio, but it follows the original song. It is not a new song written from a text prompt.

Use all files for non-commercial teaching only, with these credits.

This release leaves out the earlier image and code rounds (ArtiFact, GPTSniffer and
Chameleon files) because their licences do not allow redistribution.
