FROM --platform=linux/arm64/v8 sweb.env.py.arm64.c795f4b88616b8462021ed:latest

COPY ./setup_repo.sh /root/
RUN sed -i -e 's/\r$//' /root/setup_repo.sh
RUN /bin/bash /root/setup_repo.sh

WORKDIR /testbed/
