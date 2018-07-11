from capture import ImageCapture
import argparse
import cv2
import os
import tensorflow as tf
import matplotlib.pyplot as plt
from detect import CandyDetector
import datetime
from PIL import Image
import numpy as np
import config


def main():

    parser = argparse.ArgumentParser(description='Gather images for training.')
    parser.add_argument('--image_dir', type=str, default="training_dir", help="location for new training images + /label_name")

    args = parser.parse_args()
    image_dir = args.image_dir

    img_capture = ImageCapture(config.CAM_DEVICE, config.CAM_WIDTH, config.CAM_HEIGHT)
    img = img_capture.capture()

    print('The following labels are available in directory: ')
    for i in range(len(config.CANDIES)):
        print(i, ': ', config.CANDIES[i])
    print(len(config.CANDIES), ': ', 'other')

    lid = int(input("input number: "))
    label = ""
    if lid == len(config.CANDIES):
        label = input("label name: ")
    elif lid < 0 or lid > len(config.CANDIES):
        raise ValueError("{} is not a valid input".format(lid))
    else :
        label = config.CANDIES[lid]

    path_to_label_dir = os.path.join(image_dir, label)
    path_to_snapshot = os.path.join(image_dir, 'snapshot')
    if not tf.gfile.Exists(path_to_label_dir):
        tf.gfile.MakeDirs(path_to_label_dir)

    cv2.imwrite(os.path.join((path_to_snapshot), 'snapshot.jpg'), img)


    images = CandyDetector().detect(np.asarray(Image.open(os.path.join(path_to_snapshot, 'snapshot.jpg'))))

    for i in range(len(images)):
        tmp_file = os.path.join((path_to_label_dir), ('{}{}.jpg'.format(datetime.datetime.now().strftime('%Y%m%d_%H%M%S'), i)))
        cv2.imwrite(tmp_file, images[i].cropped_img)

    print("{} images are added to {}",len(images), label)


if __name__ == '__main__':
    main()
