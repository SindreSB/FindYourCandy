# Copyright 2017 BrainPad Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================

from __future__ import absolute_import, division, print_function, unicode_literals

import argparse
import os
import logging
import json
import sys
import tensorflow as tf
import threading

INPUT_DATA_TENSOR_NAME = 'DecodeJpeg:0'
FEATURE_TENSOR_NAME = 'pool_3/_reshape:0'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(name)-7s %(levelname)-7s %(message)s'
)
logger = logging.getLogger(__name__)


class FeatureExtractor(object):
    """
    FeatureExtractor extracts 2048-dimension feature vectors from image files
    using inception-v3.
    """

    def __init__(self, model_file):
        # load inception-v3 model
        self.graph = tf.Graph()
        with tf.gfile.FastGFile(model_file, 'rb') as f:
            graph_def = tf.GraphDef()
            graph_def.ParseFromString(f.read())
            with self.graph.as_default():
                _ = tf.import_graph_def(graph_def, name='')

            feature = tf.reshape(self.graph.get_tensor_by_name(FEATURE_TENSOR_NAME), [-1])
        self.feature_op = feature

        self.saver = None

    @classmethod
    def from_model_dir(cls, model_dir):
        return cls(os.path.join(model_dir, 'classify_image_graph_def.pb'))

    def get_feature_vector(self, img_bgr):
        with tf.Session(graph=self.graph) as sess:
            feature_data = sess.run(
                self.feature_op,
                {INPUT_DATA_TENSOR_NAME: img_bgr}
            )
        return feature_data.reshape(-1, feature_data.shape[0])

    def get_feature_vectors_from_files(self, image_paths, turn=0):
        # Decode image
        with self.graph.as_default():
            image = tf.image.decode_jpeg(tf.read_file(image_paths[0]))

        # Extract features
        features = []
        with tf.Session(graph=self.graph) as sess:
            if turn > 0:
                rotate = tf.image.rot90(image, k=turn)
                image = sess.run(rotate)
                image = tf.convert_to_tensor(image)

            for path in image_paths:
                image_data = sess.run(
                    image
                )
                feature_data = sess.run(
                    self.feature_op,
                    {INPUT_DATA_TENSOR_NAME: image_data}
                )
                features.append(feature_data)
        return features

class ImagePathGeneratorForTraining(object):
    def __init__(self, image_dir, extension='jpg'):
        self.image_dir = image_dir
        self.extension = extension

    def get_labels(self):
        return sorted(
            [sub_dir for sub_dir in tf.gfile.ListDirectory(self.image_dir)
             if tf.gfile.IsDirectory('/'.join((self.image_dir, sub_dir)))
             ]
        )

    def __iter__(self):
        for label_id, label in enumerate(self.get_labels()):
            dir_path = os.path.join(self.image_dir, label)
            paths = tf.gfile.Glob('{}/*.{}'.format(dir_path, self.extension))
            for path in paths:
                yield path, label_id
        raise StopIteration()


class ImagePathGeneratorForPrediction(object):
    def __init__(self, image_dir, extension='jpg'):
        self.image_dir = image_dir
        self.extension = extension

    def __iter__(self):
        paths = tf.gfile.Glob('{}/*.{}'.format(self.image_dir, self.extension))
        for path in paths:
            yield path, None
        raise StopIteration()


class FeaturesDataWriter(object):
    """
    FeatureDataWriter extracts feature data from images and write to json lines
    """

    def __init__(self, path_generator, feature_extractor):
        self.path_generator = path_generator
        self.extractor = feature_extractor

    def write_features(self, features_data_path, rotations):
        with tf.gfile.FastGFile(features_data_path, 'w') as f:

            progressCounter = 0

            for path, label_id in self.path_generator:
                sys.stdout.write("Thread {} - Processing image: {} with {} rotations\n"
                                 .format(str(threading.get_ident()), str(path+" " + str(progressCounter)), rotations))
                sys.stdout.flush()

                #
                for i in range(rotations + 1):
                    line = self.extract_data_for_path(path, label_id, i)
                    f.write(json.dumps(line) + '\n')
                    progressCounter += 1

    def extract_data_for_path(self, image_path, label_id, turn=0):
        vector = self.extractor.get_feature_vectors_from_files([image_path], turn)
        line = {
            'image_uri': image_path,
            'feature_vector': vector[0].tolist()
        }
        if label_id is not None:
            line['label_id'] = label_id
        return line


def write_labels(labels, labels_data_path):
    with tf.gfile.FastGFile(labels_data_path, 'w') as f:
        f.write(json.dumps(labels))

def locked_iter(it):
    it = iter(it)
    lock = threading.Lock()
    while True:
        try:
            with lock:
                value = next(it)
        except StopIteration:
            return
        yield value

def merge_files(output_file, output_dir, prefix):
    # Merge feature files
    with tf.gfile.FastGFile(output_file, 'w') as f:
        for _, _, filenames in os.walk(output_dir):
            for filename in filenames:
                if filename.startswith(prefix):
                    path = os.path.join(output_dir, filename)
                    with tf.gfile.FastGFile(path, 'r') as g:
                        f.write(g.read())
                    os.remove(path)

def main():
    parser = argparse.ArgumentParser(description='Run Dobot WebAPI.')
    parser.add_argument('--output_dir', default ='output',nargs=1, type=str)
    parser.add_argument('--image_dir_train', default='../image/train', type=str)
    parser.add_argument('--active_test_mode', default=False, help='Set True for testing')
    parser.add_argument('--image_dir_test', default='../image/test', type=str)
    parser.add_argument('--model_file', type=str, default='classify_image_graph_def.pb')
    parser.add_argument('--for_prediction', action='store_true')
    parser.add_argument('--threads', default=1, type=int)
    parser.add_argument('--rotations', default=0, type=int, help="Number of 90deg rotations of the training image to use.")

    args = parser.parse_args()
    output_dir = args.output_dir

    labels_file = os.path.join(output_dir, 'labels.json')
    features_file_train = os.path.join(output_dir, 'features.json')
    features_file_test = os.path.join(output_dir, 'testfeatures.json')


    model_file = args.model_file

    if args.for_prediction:
        path_gen_train = ImagePathGeneratorForPrediction(args.image_dir_train)
        if (args.active_test_mode):
            path_gen_test = ImagePathGeneratorForPrediction(args.image_dir_test)
    else:
        path_gen_train = ImagePathGeneratorForTraining(args.image_dir_train)
        if args.active_test_mode :
            path_gen_test = ImagePathGeneratorForTraining(args.image_dir_test)

        logger.info("writing label file: {}".format(labels_file))
        write_labels(path_gen_train.get_labels(), labels_file)

    # Create thread safe iterators for train and test images if needed
    if args.threads > 1:
        path_gen_train = locked_iter(path_gen_train)
        path_gen_test = locked_iter(path_gen_test)

    def ExtractionTask(generator, index, file_prefix):
        extractor = FeatureExtractor(model_file)
        writer_train = FeaturesDataWriter(generator, extractor)

        output_file = os.path.join(output_dir, file_prefix + str(index) + '.json')
        logger.info("writing train features file: {}".format(output_file))

        # Try to parallellization
        writer_train.write_features(output_file, args.rotations)

    # Create threads that run the extraction
    train_threads = [threading.Thread(target=ExtractionTask, args=(path_gen_train, i, 'temp-train-',))
                     for i in range(args.threads)]

    # Start the threads
    for t in train_threads:
        t.start()

    # Wait for all threads to complete
    for t in train_threads:
        t.join()


    if args.active_test_mode:
        test_threads = [threading.Thread(target=ExtractionTask, args=(path_gen_test, i, 'temp-test-'))
                        for i in range(args.threads)]

        # Start the threads
        for t in test_threads:
            t.start()

        # Wait for all threads to complete
        for t in test_threads:
            t.join()

        merge_files(features_file_test, output_dir, "temp-test")

    merge_files(features_file_train, output_dir, "temp-train")

    print("COMPLETE")


if __name__ == "__main__":
    main()