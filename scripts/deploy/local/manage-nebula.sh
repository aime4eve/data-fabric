#!/bin/bash

# Nebula Graph管理脚本

case "$1" in
    "start")
        echo "🚀 启动Nebula Graph服务..."
        docker-compose up -d nebula-graph nebula-storaged nebula-metad
        ;;
    "stop")
        echo "🛑 停止Nebula Graph服务..."
        docker-compose stop nebula-graph nebula-storaged nebula-metad
        ;;
    "restart")
        echo "🔄 重启Nebula Graph服务..."
        docker-compose restart nebula-graph nebula-storaged nebula-metad
        ;;
    "status")
        echo "🔍 查看服务状态..."
        docker-compose ps
        ;;
    "logs")
        echo "📋 查看服务日志..."
        docker-compose logs "$2"
        ;;
    "console")
        echo "💻 进入Nebula Console..."
        docker exec -it knowledge-base-nebula-graph /usr/local/nebula/bin/nebula-console -u root -p nebula --address=127.0.0.1 --port=9669
        ;;
    "backup")
        echo "💾 备份数据..."
        docker exec knowledge-base-nebula-graph /usr/local/nebula/bin/nebula-backup --meta=nebula-metad:9559 --storage=nebula-storaged:9779 --backup_dir=/data/backup
        ;;
    *)
        echo "使用方法: $0 {start|stop|restart|status|logs [服务名]|console|backup}"
        echo ""
        echo "命令说明:"
        echo "  start     - 启动Nebula Graph服务"
        echo "  stop      - 停止Nebula Graph服务"
        echo "  restart   - 重启Nebula Graph服务"
        echo "  status    - 查看服务状态"
        echo "  logs      - 查看服务日志"
        echo "  console   - 进入Nebula Console"
        echo "  backup    - 备份数据"
        exit 1
        ;;
esac