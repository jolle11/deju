FROM alpine:3.22 AS download

ARG PB_VERSION=0.40.5

RUN apk add --no-cache unzip
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip pocketbase -d /pb/

FROM alpine:3.22

RUN apk add --no-cache ca-certificates

COPY --from=download /pb/pocketbase /pb/pocketbase
COPY ./pb_migrations /pb/pb_migrations
COPY ./pb_hooks /pb/pb_hooks

EXPOSE 8090

# pb_data must be a mounted Railway volume (/pb/pb_data)
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
