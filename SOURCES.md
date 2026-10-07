# Spot the AI: sources

| Round | Type            | Source                                                                                          | Where the files came from                                                                                                         | Licence notes                                                                                    |
| ----- | --------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | Image           | ArtiFact (Rahman et al., ICIP 2023)                                                             | github.com/awsaf49/artifact, images/visual_summary2.jpg (cropped)                                                                 | Mixed by subset: COCO CC BY 4.0, ImageNet non-commercial, LSUN unknown, StyleGAN2 Nvidia licence |
| 2     | Code (Java)     | GPTSniffer (Nguyen et al., Journal of Systems and Software, 2024)                               | github.com/MDEGroup/GPTSniffer, DATASETS/RQ1/C1/CONF/testing_data/0_Exercise02_02.java (ChatGPT) and 1_Exercise02_02.java (human) | Research dataset. The human file is a textbook exercise solution. Teaching use only              |
| 3     | Essay paragraph | Ghostbuster (Verma et al., NAACL 2024)                                                          | github.com/vivek3141/ghostbuster-data, essay/human/2.txt and essay/gpt/2.txt (first paragraph of each)                            | Repository licence CC BY 3.0. Human essays come from an online essay site, per the paper         |
| 4     | Image           | Chameleon test set (Yan et al., ICLR 2025)                                                      | github.com/shilinyan99/AIDE, docs/Chameleon.jpg (cropped)                                                                         | Academic research only. Commercial use prohibited                                                |
| 5     | Music           | Deezer Research, "AI-Generated Music Detection and its Challenges" (Afchar et al., ICASSP 2025) | github.com/deezer/deepfake-detector, audio_examples/real/000002.mp3 and audio_examples/musika/000002.mp3                          | Repository licence CC BY-NC 4.0. The real track is from the Free Music Archive (FMA)             |

## Changes made to the originals

- Images: cropped out of the labelled source figures. The crops remove all labels and borders.
- Code: removed the `package` line from the human file and collapsed repeated blank lines. All other text is unchanged.
- Essays: the first paragraph of each essay, unchanged.
- Music: seconds 4 to 24 of each 30-second clip, loudness-normalised to -16 LUFS with 0.5 s fade-in and 1 s fade-out, so volume does not give the answer.

## Note on round 5

The AI sample is the same FMA track rebuilt by Musika, a neural music model. It is AI-generated audio, but it follows the original song. It is not a new song written from a text prompt.

Use all files for non-commercial teaching only, with these credits.
