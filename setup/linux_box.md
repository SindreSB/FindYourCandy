Linux Setup
===

## OS installation
- Ubuntu 16.04.4 LTS Server or Desktop
- Choose “standard system utilities” and “OpenSSH server” as software selection
- Create user:  brainpad (group is also brainpad by default)

## Basic setup

- Update packages
```
$ sudo apt-get update && sudo apt-get upgrade -y && sudo reboot
$ sudo apt-get install ubuntu-desktop # if you have installed server edition
```

- Install Docker, Ansible, git
```
$ sudo apt-get install git
$ sudo apt-get install docker
$ sudo apt-get install ansible
```

- Install Google Chrome (needed for web app)
```
$ wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add - 
$ sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
$ sudo apt-get update && sudo apt-get install google-chrome-stable
```

- Check Python version:
```
$ python -V
Python 2.7.12
```

