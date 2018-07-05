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

import errno
import importlib
import os
import platform
import random
import string


def load_class(name):
    parts = name.split('.')
    module = importlib.import_module('.'.join(parts[:-1]))
    return getattr(module, parts[-1])


def get_classifier_dir(config):
    if platform.system() == 'Windows':
        with open(config['CLASSIFIER_MODEL_DIR']) as f:
            return os.path.join(config['MODEL_DIR'], f.readline())
    else:
        return config['CLASSIFIER_MODEL_DIR']


def update_classifier_dir(config, job_id):
    folder_name = 'classifier_{}'.format(job_id)
    if platform.system() == 'Windows':
        with open(config['CLASSIFIER_MODEL_DIR'], 'w') as f:
            f.write(folder_name)
    else:
        new_dir = os.path.join(config['MODEL_DIR'], folder_name)
        symlink_force(new_dir, config['CLASSIFIER_MODEL_DIR'])

def reset_classifier_dir(config):
    if platform.system() == 'Windows':
        with open(config['CLASSIFIER_MODEL_DIR'], 'w') as f:
            f.write(config['CLASSIFIER_DIR_NAME_INITIAL'])
    else:
        symlink_force(os.path.basename(config['CLASSIFIER_MODEL_DIR_INITIAL']), config['CLASSIFIER_MODEL_DIR'])


def symlink_force(source, link_name):
    try:
        os.symlink(source, link_name)
    except OSError as e:
        if e.errno == errno.EEXIST:
            os.unlink(link_name)
            os.symlink(source, link_name)
        else:
            raise e


def random_str(length, chars=string.ascii_letters + string.digits):
    return ''.join([random.choice(chars) for i in range(length)])
