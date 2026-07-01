# Pneumonia Detection from Chest X-rays

Pneumonia Detection is a deep-learning computer-vision project that classifies chest
X-ray images as either normal or showing pneumonia. Beyond the prediction itself, the model
produces Grad-CAM heatmaps that highlight the regions of each X-ray driving the decision,
adding a layer of interpretability that matters in a medical context.

## Why the project matters

In healthcare, a prediction is only useful if it can be trusted and understood. By pairing a
convolutional classifier with Grad-CAM explainability, the project shows not just whether an
image looks like pneumonia but where the model is "looking" — making the output easier for a
human to sanity-check. It reflects Sergio's interest in combining deep learning with
explainability.

## Pneumonia detection tech stack

Python, Keras, OpenCV, a MobileNetV2 backbone (transfer learning), and Grad-CAM for
explainability.
